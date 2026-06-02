export type SpeechPlatform = "ios" | "android" | "windows" | "other";

let lastWarmUpAt = 0;
let audioContext: AudioContext | null = null;

export function getSpeechPlatform(): SpeechPlatform {
  if (typeof navigator === "undefined") return "other";

  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  if (/Android/i.test(ua)) return "android";
  if (/Win/i.test(platform)) return "windows";
  if (/iPad|iPhone|iPod/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1)) {
    return "ios";
  }

  return "other";
}

export function getVoiceId(voice: SpeechSynthesisVoice): string {
  return voice.voiceURI || `${voice.name}::${voice.lang}`;
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];

  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang?.toLowerCase().startsWith("en"))
    .sort((a, b) => {
      if (a.default !== b.default) return a.default ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function findSpeechVoice(
  voices: SpeechSynthesisVoice[],
  preferredVoice?: string
): SpeechSynthesisVoice | undefined {
  const englishVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith("en"));
  const candidates = englishVoices.length > 0 ? englishVoices : voices;
  const requested = preferredVoice?.trim();

  if (requested) {
    const requestedLower = requested.toLowerCase();

    return (
      candidates.find((voice) => getVoiceId(voice) === requested) ||
      candidates.find((voice) => voice.voiceURI === requested) ||
      candidates.find((voice) => voice.name === requested) ||
      candidates.find((voice) => `${voice.name}::${voice.lang}` === requested) ||
      candidates.find((voice) => getVoiceId(voice).toLowerCase() === requestedLower) ||
      candidates.find((voice) => voice.name.toLowerCase() === requestedLower) ||
      candidates.find((voice) => voice.voiceURI.toLowerCase() === requestedLower) ||
      candidates.find((voice) => {
        const name = voice.name.toLowerCase();
        const uri = voice.voiceURI.toLowerCase();
        return name.includes(requestedLower) || uri.includes(requestedLower);
      })
    );
  }

  return (
    candidates.find(
      (voice) =>
        voice.default &&
        voice.lang?.toLowerCase().startsWith("en")
    ) ||
    candidates.find((voice) =>
      /google|natural|premium|samantha|daniel|microsoft/i.test(voice.name)
    ) ||
    candidates[0]
  );
}

export function logSpeechDiagnostic(
  event: string,
  details: Record<string, unknown> = {}
) {
  console.info("[speech-synthesis]", event, {
    platform: getSpeechPlatform(),
    ...details,
  });
}

export function applyVoiceToUtterance(
  utterance: SpeechSynthesisUtterance,
  selectedVoice?: SpeechSynthesisVoice
) {
  if (!selectedVoice) {
    utterance.lang = "en-US";
    return;
  }

  utterance.voice = selectedVoice;
  utterance.lang = selectedVoice.lang || "en-US";
}

function resumeAudioContext() {
  if (typeof window === "undefined") return;

  const AudioContextCtor =
    window.AudioContext || (window as any).webkitAudioContext;

  if (!AudioContextCtor) return;

  try {
    audioContext = audioContext || new AudioContextCtor();

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioContext.createBuffer(1, 1, 22050);
    source.connect(audioContext.destination);
    source.start(0);
  } catch (error) {
    logSpeechDiagnostic("audio-context-unlock-failed", { error });
  }
}

export function warmUpSpeechSynthesis(force = false) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const now = Date.now();
  if (!force && now - lastWarmUpAt < 750) return;
  lastWarmUpAt = now;

  resumeAudioContext();

  try {
    window.speechSynthesis.resume();
  } catch (error) {
    logSpeechDiagnostic("resume-failed", { error });
  }

  const platform = getSpeechPlatform();

  try {
    const warmUp = new SpeechSynthesisUtterance(".");
    warmUp.volume = platform === "ios" ? 0.01 : 0;
    warmUp.rate = 1.1;
    warmUp.pitch = 1;
    warmUp.onstart = () => logSpeechDiagnostic("warmup-start");
    warmUp.onend = () => logSpeechDiagnostic("warmup-end");
    warmUp.onerror = (event) =>
      logSpeechDiagnostic("warmup-error", { error: event.error });

    window.speechSynthesis.speak(warmUp);
  } catch (error) {
    logSpeechDiagnostic("warmup-exception", { error });
  }
}
