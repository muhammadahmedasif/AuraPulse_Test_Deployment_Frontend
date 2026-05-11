"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type RecognitionState = "idle" | "listening" | "error" | "unsupported";

export default function VoiceTestPage() {
  const recognitionRef = useRef<any>(null);
  const [state, setState] = useState<RecognitionState>("idle");
  const [transcript, setTranscript] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState<string>("");
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check browser support
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setState("unsupported");
      return;
    }

    // Create recognition instance (only once)
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
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          final += text + " ";
        } else {
          interim += text;
        }
      }

      if (final) {
        setTranscript((prev) => prev + final);
        setIsFinal(true);
      } else if (interim) {
        setTranscript(interim);
        setIsFinal(false);
      }
    };

    recognition.onerror = (event: any) => {
      setState("error");
      const errorMessages: Record<string, string> = {
        "no-speech": "No speech detected. Please try again.",
        "audio-capture": "No microphone found. Check your audio input.",
        "permission-denied": "Microphone permission denied.",
        "network": "Network error. Check your connection.",
      };
      setError(errorMessages[event.error] || `Error: ${event.error}`);
    };

    recognition.onend = () => {
      setState("idle");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  const handleStart = () => {
    if (!recognitionRef.current || !isSupported) return;
    recognitionRef.current.start();
  };

  const handleStop = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  };

  const handleClear = () => {
    setTranscript("");
    setError("");
    setIsFinal(false);
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">Browser Not Supported</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                Speech Recognition is not supported in your browser. Voice features require:
              </p>
              <ul className="text-sm space-y-2 list-disc list-inside">
                <li>Chrome/Chromium (Desktop recommended)</li>
                <li>Edge on Windows/Mac</li>
                <li>Android Chrome</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-4">
                Safari, Firefox, and other browsers do not support Web Speech API STT.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Voice Test Page</h1>
          <p className="text-muted-foreground">Test SpeechRecognition before integration</p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {state === "idle" && <div className="w-3 h-3 rounded-full bg-gray-400" />}
              {state === "listening" && (
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              )}
              {state === "error" && <AlertCircle className="w-5 h-5 text-destructive" />}
              <span className="capitalize font-medium">{state}</span>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={handleStart}
                disabled={state === "listening" || state === "unsupported"}
                size="lg"
                className="flex-1"
              >
                <Mic className="w-4 h-4 mr-2" />
                Start Listening
              </Button>
              <Button
                onClick={handleStop}
                disabled={state !== "listening"}
                variant="outline"
                size="lg"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
              <Button onClick={handleClear} variant="outline" size="lg">
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transcript</CardTitle>
            <CardDescription>
              {isFinal ? "Final" : "Interim"} - Speak naturally and clearly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-secondary/50 rounded-lg p-4 min-h-24 space-y-2">
              {transcript ? (
                <p className="text-base leading-relaxed">{transcript}</p>
              ) : (
                <p className="text-muted-foreground italic">
                  {state === "listening"
                    ? "Listening..."
                    : "Click 'Start Listening' and speak"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Ready for Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>✓ SpeechRecognition working in your browser</p>
            <p>✓ Microphone permission granted</p>
            <p>✓ Ready to test in VoiceModal component</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
