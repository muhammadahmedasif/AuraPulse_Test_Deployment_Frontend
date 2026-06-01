import { useCallback, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

export interface UseVoiceAgentReturn {
  state: VoiceState;
  transcript: string;
  isFinal: boolean;
  error: string;
  startListening: () => void;
  stopListening: () => void;
  cancel: () => void;
  getTranscript: () => string;
  isSupported: () => boolean;
  canSpeak: () => boolean;
  speak: (text: string, onComplete?: () => void) => void;
  stopSpeaking: () => void;
  resetVoiceSession: () => void;
}

export function useVoiceAgent(preferredVoiceUri?: string): UseVoiceAgentReturn {
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState("");

  // Helper: create a fresh SpeechRecognition instance and wire up event handlers
  const createRecognitionInstance = useCallback(() => {
    if (typeof window === "undefined") return null;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setState("listening");
      setError("");
      setTranscript("");
      setIsFinal(false);
    };

    recognition.onresult = (event: any) => {
      // For non-continuous recognition, we only need the latest result
      // which contains the full transcript of the current phrase.
      const last = event.results.length - 1;
      if (event.results[last] && event.results[last][0]) {
        const text = event.results[last][0].transcript;
        setTranscript(text);
        setIsFinal(event.results[last].isFinal);
      }
    };

    recognition.onerror = (event: any) => {
      setState("error");
      const errorMessages: Record<string, string> = {
        "no-speech": "No speech detected. Please try again.",
        "audio-capture": "No microphone found.",
        "permission-denied": "Microphone permission denied.",
        "network": "Network error.",
      };
      setError(errorMessages[event.error] || `Error: ${event.error}`);
    };

    recognition.onend = () => {
      setState("idle");
    };

    return recognition;
  }, []);

  // Initialize on first access (lazy init)
  const getRecognition = useCallback(() => {
    if (!recognitionRef.current) {
      recognitionRef.current = createRecognitionInstance();
    }
    return recognitionRef.current;
  }, [createRecognitionInstance]);

  const startListening = useCallback(() => {
    const recognition = getRecognition();
    if (!recognition || !isSupported()) return;
    try {
      recognition.start();
    } catch (e) {
      // Already listening or other error - ignore
    }
  }, [getRecognition]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // Already stopped - ignore
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState("idle");
  }, []);

  const cancel = useCallback(() => {
    stopListening();
    stopSpeaking();
    setTranscript("");
    setError("");
    setIsFinal(false);
    setState("idle");
  }, [stopListening, stopSpeaking]);

  const getTranscript = useCallback(() => transcript.trim(), [transcript]);

  const isSupported = useCallback(() => {
    if (typeof window === "undefined") return false;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SpeechRecognition;
  }, []);

  const canSpeak = useCallback(() => {
    if (typeof window === "undefined") return false;
    return !!window.speechSynthesis;
  }, []);

  const speak = useCallback((text: string, onComplete?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      console.warn("Speech synthesis not supported");
      onComplete?.();
      return;
    }

    setState("speaking");
    window.speechSynthesis.cancel();

    // iOS workaround: speechSynthesis can get stuck in a paused state.
    // Calling resume() before speaking ensures audio output works.
    try {
      window.speechSynthesis.resume();
    } catch (e) {
      // ignore — not all browsers support resume()
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";

    // Helper to find and assign voice, then speak
    const assignVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        let selectedVoice: SpeechSynthesisVoice | undefined;

        if (preferredVoiceUri) {
          // Primary: exact voiceURI match
          selectedVoice = voices.find(v => v.voiceURI === preferredVoiceUri);

          // Fallback: match by voice name (cross-device compatibility)
          if (!selectedVoice) {
            selectedVoice = voices.find(v => v.name === preferredVoiceUri);
          }
        }

        if (!selectedVoice) {
          // Default fallback: prioritize natural sounding voices
          selectedVoice = voices.find(v =>
            (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Premium")) &&
            v.lang.startsWith("en")
          ) || voices.find(v => v.lang.startsWith("en"));
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      // Calming therapeutic pace and tone
      utterance.rate = 0.88;
      utterance.pitch = 0.95;
      utterance.volume = 1;

      utterance.onend = () => {
        setState("idle");
        onComplete?.();
      };

      utterance.onerror = (e) => {
        // iOS sometimes fires 'interrupted' error on cancel — don't treat as real error
        if (e.error === "interrupted" || e.error === "canceled") {
          setState("idle");
          onComplete?.();
          return;
        }
        console.warn("TTS error:", e.error);
        setState("idle");
        onComplete?.();
      };

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);

      // iOS bug workaround: speechSynthesis can pause itself after ~15s.
      // Periodically call resume() to keep it alive.
      const iosKeepAlive = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.resume();
        } else {
          clearInterval(iosKeepAlive);
        }
      }, 5000);

      // Safety: clear interval when done
      utterance.onend = () => {
        clearInterval(iosKeepAlive);
        setState("idle");
        onComplete?.();
      };
      utterance.onerror = (e) => {
        clearInterval(iosKeepAlive);
        if (e.error === "interrupted" || e.error === "canceled") {
          setState("idle");
          onComplete?.();
          return;
        }
        console.warn("TTS error:", e.error);
        setState("idle");
        onComplete?.();
      };
    };

    // Voices may not be loaded yet (especially on Android/iOS).
    // If empty, wait for voiceschanged event before speaking.
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      const onVoicesReady = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesReady);
        assignVoiceAndSpeak();
      };
      window.speechSynthesis.addEventListener("voiceschanged", onVoicesReady);
      // Safety timeout: if voiceschanged never fires, speak anyway after 500ms
      setTimeout(() => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesReady);
        if (window.speechSynthesis.speaking) return; // already started
        assignVoiceAndSpeak();
      }, 500);
    } else {
      assignVoiceAndSpeak();
    }
  }, [preferredVoiceUri]);

  // Full cleanup + fresh reinitialization for modal reopen
  const resetVoiceSession = useCallback(() => {
    // 1. Stop any active recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    // 2. Cancel speech synthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    synthRef.current = null;

    // 3. Reset all state
    setState("idle");
    setTranscript("");
    setIsFinal(false);
    setError("");

    // 4. Create fresh recognition instance
    recognitionRef.current = createRecognitionInstance();
  }, [createRecognitionInstance]);

  return {
    state,
    transcript,
    isFinal,
    error,
    startListening,
    stopListening,
    cancel,
    getTranscript,
    isSupported,
    canSpeak,
    speak,
    stopSpeaking,
    resetVoiceSession,
  };
}
