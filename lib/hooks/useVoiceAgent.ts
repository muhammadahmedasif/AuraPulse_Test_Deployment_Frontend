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

export function useVoiceAgent(): UseVoiceAgentReturn {
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

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    
    // Voice selection for better quality (Natural/Google voices)
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Prioritize natural sounding voices
      const preferredVoice = voices.find(v => 
        (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Premium")) && 
        v.lang.startsWith("en")
      ) || voices.find(v => v.lang.startsWith("en"));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    // Calming therapeutic pace and tone
    utterance.rate = 0.88; // Slightly slower for relaxation
    utterance.pitch = 0.95; // Slightly lower for a warmer tone
    utterance.volume = 1;

    utterance.onend = () => {
      setState("idle");
      onComplete?.();
    };

    utterance.onerror = () => {
      setState("idle");
      onComplete?.();
    };

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

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
