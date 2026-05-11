"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useVoiceAgent } from "@/lib/hooks/useVoiceAgent";
import { MicButton } from "./MicButton";
import { sendChatMessageStream, createChatSession } from "@/lib/api/chat";
import { cn } from "@/lib/utils";
import { AlertCircle, Send, Zap, MessageSquarePlus, Loader2 } from "lucide-react";

interface VoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onMessageSent?: () => void;
  onActivityTrigger?: (activityType: string, triggerReason: string) => void;
  activityActive?: boolean;
  onSessionChange?: (newSessionId: string) => void;
}

const MIN_TRANSCRIPT_LENGTH = 2;
const AUTO_RESUME_DELAY_MS = 500;

export function VoiceModal({
  open,
  onOpenChange,
  sessionId,
  onMessageSent,
  onActivityTrigger,
  activityActive = false,
  onSessionChange,
}: VoiceModalProps) {
  const voice = useVoiceAgent();
  const conversationModeRef = useRef(false);
  const autoResumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef("");
  const [aiResponse, setAiResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState("");
  const [messageHistory, setMessageHistory] = useState<{ role: string; text: string }[]>([]);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);

  // Store activity metadata until TTS completes
  const pendingActivityRef = useRef<{ type: string; reason: string } | null>(null);

  // Track the active session internally so New Chat can switch without closing modal
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  // Sync from parent prop when modal opens with a new session
  useEffect(() => {
    if (open && sessionId) {
      setCurrentSessionId(sessionId);
    }
  }, [open, sessionId]);

  // ─── Activity Pause Synchronization ───────────────────────────────────
  // When activityActive becomes true, pause voice loop.
  // When it becomes false, resume if conversation mode was active.
  const wasConversationModeBeforeActivity = useRef(false);

  useEffect(() => {
    if (!open) return;

    if (activityActive) {
      // Activity modal opened — pause everything
      wasConversationModeBeforeActivity.current = conversationModeRef.current;
      voice.stopListening();
      voice.stopSpeaking();
      if (autoResumeTimerRef.current) {
        clearTimeout(autoResumeTimerRef.current);
        autoResumeTimerRef.current = null;
      }
    } else {
      // Activity modal closed — resume if conversation mode was active before
      if (wasConversationModeBeforeActivity.current && conversationModeRef.current) {
        autoResumeTimerRef.current = setTimeout(() => {
          // Resume Guard Protection
          if (
            open &&
            conversationModeRef.current &&
            !activityActive &&
            !isStreaming &&
            voice.state !== "error"
          ) {
            voice.startListening();
          }
        }, 500); // 500ms delay for DOM stabilization and focus restoration
      }
    }
  }, [activityActive, open, isStreaming, voice.state]);

  // ─── Send Message ─────────────────────────────────────────────────────
  const sendMessage = async (userMessage: string) => {
    const messageText = userMessage.trim();
    if (!messageText || isStreaming) return;

    // Add to history
    setMessageHistory((prev) => [...prev, { role: "user", text: messageText }]);

    // Clear for next input
    voice.cancel();
    setAiResponse("");
    setStreamError("");
    lastTranscriptRef.current = "";

    // Send to chat API
    setIsStreaming(true);

    try {
      const response = await sendChatMessageStream(currentSessionId, messageText);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);

            if (data.t === "chunk") {
              fullText += data.d;
              setAiResponse(fullText);
            } else if (data.t === "done") {
              // ── Activity trigger detection (same as text chat) ──
              if (
                data.metadata?.emotionMeta?.autoTrigger &&
                data.metadata?.emotionMeta?.suggestedActivity &&
                onActivityTrigger
              ) {
                // Store pending activity until TTS finishes
                pendingActivityRef.current = {
                  type: data.metadata.emotionMeta.suggestedActivity,
                  reason: data.metadata.emotionMeta.emotion
                };
              }
            }
          } catch (e) {
            console.error("Error parsing response:", e);
          }
        }
      }

      // Add to history and play TTS
      setMessageHistory((prev) => [...prev, { role: "assistant", text: fullText }]);

      if (fullText.trim() && !activityActive) {
        // Stop listening before TTS to prevent AI voice capture
        voice.stopListening();

        voice.speak(fullText, () => {
          // Reset state after speaking
          setAiResponse("");

          // Trigger activity if pending
          if (pendingActivityRef.current && onActivityTrigger) {
            const { type, reason } = pendingActivityRef.current;
            
            // Stop voice before opening activity
            voice.stopListening();
            voice.stopSpeaking();
            if (autoResumeTimerRef.current) {
              clearTimeout(autoResumeTimerRef.current);
              autoResumeTimerRef.current = null;
            }

            onActivityTrigger(type, reason);
            pendingActivityRef.current = null;
          } else {
            // Resume listening after TTS finishes (if conversation still active, modal open, no activity)
            if (conversationModeRef.current && open && !activityActive) {
              if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
              autoResumeTimerRef.current = setTimeout(() => {
                if (conversationModeRef.current && open && !isStreaming && !activityActive && voice.state !== "error") {
                  voice.startListening();
                }
              }, AUTO_RESUME_DELAY_MS);
            }
          }
        });
      } else {
        // Fallback: trigger immediately if no text generated or TTS disabled
        if (pendingActivityRef.current && onActivityTrigger) {
          const { type, reason } = pendingActivityRef.current;
          
          voice.stopListening();
          voice.stopSpeaking();
          if (autoResumeTimerRef.current) {
            clearTimeout(autoResumeTimerRef.current);
            autoResumeTimerRef.current = null;
          }

          onActivityTrigger(type, reason);
          pendingActivityRef.current = null;
        }
      }

      onMessageSent?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      setStreamError(errorMessage);
      console.error("Error sending voice message:", err);

      // Resume listening on error if in conversation mode
      if (conversationModeRef.current && open && !activityActive) {
        if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
        autoResumeTimerRef.current = setTimeout(() => {
          if (conversationModeRef.current && open && voice.state === "idle") {
            voice.startListening();
          }
        }, AUTO_RESUME_DELAY_MS);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleMicClick = () => {
    if (voice.state === "listening") {
      voice.stopListening();
    } else if (voice.state === "idle" && !isStreaming && !activityActive) {
      voice.startListening();
    }
  };

  const handleToggleConversationMode = () => {
    const newMode = !isConversationMode;
    conversationModeRef.current = newMode;
    setIsConversationMode(newMode);

    if (newMode && voice.state === "idle" && !isStreaming && !activityActive) {
      voice.startListening();
    } else if (!newMode) {
      voice.stopListening();
      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
    }
  };

  const handleManualSend = async () => {
    const transcript = voice.getTranscript();
    if (transcript.trim()) {
      await sendMessage(transcript);
    }
  };

  const clearAllLocalState = () => {
    conversationModeRef.current = false;
    wasConversationModeBeforeActivity.current = false;
    if (autoResumeTimerRef.current) {
      clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = null;
    }
    lastTranscriptRef.current = "";
    pendingActivityRef.current = null;
    setAiResponse("");
    setIsStreaming(false);
    setStreamError("");
    setMessageHistory([]);
    setIsConversationMode(false);
    setIsCreatingNewChat(false);
  };

  const handleClose = () => {
    clearAllLocalState();
    voice.resetVoiceSession();
    onOpenChange(false);
  };

  // ─── New Chat ─────────────────────────────────────────────────────────
  const handleNewChat = async () => {
    if (isCreatingNewChat) return;

    setIsCreatingNewChat(true);

    try {
      // 1. Stop all voice activity
      voice.stopListening();
      voice.stopSpeaking();
      if (autoResumeTimerRef.current) {
        clearTimeout(autoResumeTimerRef.current);
        autoResumeTimerRef.current = null;
      }

      // 2. Clear conversation state
      lastTranscriptRef.current = "";
      setAiResponse("");
      setStreamError("");
      setMessageHistory([]);
      voice.cancel();

      // 3. Create new session via existing API
      const newSessionId = await createChatSession();
      setCurrentSessionId(newSessionId);

      // 4. Notify parent
      onSessionChange?.(newSessionId);

      // 5. Resume hands-free if conversation mode was active
      if (conversationModeRef.current) {
        autoResumeTimerRef.current = setTimeout(() => {
          if (conversationModeRef.current && open) {
            voice.startListening();
          }
        }, AUTO_RESUME_DELAY_MS);
      }
    } catch (err) {
      console.error("Error creating new chat:", err);
      setStreamError("Failed to create new chat. Please try again.");
    } finally {
      setIsCreatingNewChat(false);
    }
  };

  // ─── Auto-send Effect ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open || !conversationModeRef.current || isStreaming || activityActive) return;

    const currentTranscript = voice.getTranscript();

    if (
      voice.isFinal &&
      currentTranscript.trim().length >= MIN_TRANSCRIPT_LENGTH &&
      currentTranscript !== lastTranscriptRef.current
    ) {
      lastTranscriptRef.current = currentTranscript;
      sendMessage(currentTranscript);
    }
  }, [voice.transcript, voice.isFinal, isStreaming, open, activityActive]);

  // ─── Cleanup on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      conversationModeRef.current = false;
      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
      voice.resetVoiceSession();
    };
  }, []);

  // ─── Unsupported Browser ─────────────────────────────────────────────
  if (!voice.isSupported()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Voice Not Supported</DialogTitle>
            <DialogDescription>
              Your browser doesn't support voice conversations
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Voice works best on Chrome, Edge, or Chromium-based browsers. Please use the text chat instead.
            </AlertDescription>
          </Alert>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <Dialog 
      open={open} 
      modal={!activityActive}
      onOpenChange={(isOpen) => {
        // Prevent closing the VoiceModal while activity is active
        if (activityActive) return;
        handleClose();
      }}
    >
      <DialogContent 
        className={cn(
          "sm:max-w-[600px] bg-card/80 backdrop-blur-lg",
          activityActive && "pointer-events-none opacity-50"
        )}
        overlayClassName={cn(activityActive && "pointer-events-none")}
        onInteractOutside={(e) => {
          // Prevent closing when clicking on Activity Modal
          if (activityActive) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (activityActive) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Voice Therapy Session</DialogTitle>
          <DialogDescription>
            {activityActive
              ? "Complete the activity to resume voice conversation"
              : isConversationMode
                ? "Hands-free mode - speak naturally and I'll respond"
                : "Speak naturally - AuraPulse is listening and ready to help"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge & Controls */}
          <div className="flex items-center justify-between gap-2">
            <Badge variant={voice.state === "listening" ? "default" : "outline"}>
              {voice.state === "idle" && "Ready to listen"}
              {voice.state === "listening" && "🎤 Listening..."}
              {voice.state === "processing" && "⏳ Processing..."}
              {voice.state === "speaking" && "🔊 Speaking..."}
              {voice.state === "error" && "❌ Error"}
            </Badge>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleToggleConversationMode}
                variant={isConversationMode ? "default" : "outline"}
                size="sm"
                className="gap-1"
                disabled={activityActive}
              >
                <Zap className="w-3 h-3" />
                {isConversationMode ? "Hands-Free On" : "Manual Mode"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Activity Pause Banner */}
          {activityActive && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center"
            >
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                🧘 Activity in progress — voice paused
              </p>
            </motion.div>
          )}

          {/* Mic Button */}
          <div className="flex justify-center py-4">
            <MicButton
              state={voice.state}
              onClick={handleMicClick}
              disabled={isStreaming || isConversationMode || activityActive}
              size="lg"
              className="h-16 w-16 rounded-full"
            />
          </div>

          {/* Transcript Display */}
          <div className="bg-secondary/50 rounded-lg p-4 min-h-24 space-y-2">
            {voice.transcript ? (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Your words:</p>
                <p className="text-base leading-relaxed">{voice.transcript}</p>
                {!voice.isFinal && (
                  <p className="text-xs text-muted-foreground italic mt-2">Still listening...</p>
                )}
                {voice.isFinal && isConversationMode && (
                  <p className="text-xs text-green-600 italic mt-2">✓ Ready to send...</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                {activityActive
                  ? "Voice paused during activity..."
                  : isConversationMode && voice.state === "idle"
                    ? "Click Start or begin speaking..."
                    : voice.state === "listening"
                      ? "Listening for your voice..."
                      : "Click the mic to start speaking"}
              </p>
            )}
          </div>

          {/* AI Response Display */}
          <AnimatePresence mode="wait">
            {(aiResponse || isStreaming) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-primary/5 rounded-lg p-4 space-y-2"
              >
                <p className="text-sm font-medium text-muted-foreground">Therapist:</p>
                <p className="text-base leading-relaxed">
                  {aiResponse || "Thinking..."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Display */}
          {(voice.error || streamError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {voice.error || streamError}
              </AlertDescription>
            </Alert>
          )}

          {/* Message History */}
          {messageHistory.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-2 bg-muted/20 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground">Conversation:</p>
              {messageHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`text-xs py-1 px-2 rounded ${
                    msg.role === "user"
                      ? "bg-primary/20 text-primary ml-auto max-w-xs"
                      : "bg-secondary/50 text-secondary-foreground max-w-xs"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Controls */}
          <div className="flex gap-2">
            {!isConversationMode && (
              <Button
                onClick={handleManualSend}
                disabled={!voice.transcript.trim() || isStreaming || activityActive}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            )}
            <Button
              onClick={handleNewChat}
              variant="outline"
              disabled={isCreatingNewChat || activityActive}
              className="gap-1"
            >
              {isCreatingNewChat ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquarePlus className="w-4 h-4" />
              )}
              New Chat
            </Button>
            <Button
              onClick={() => voice.cancel()}
              variant="outline"
              disabled={activityActive}
            >
              Clear
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-muted-foreground text-center">
            {activityActive
              ? "Complete the therapeutic activity to resume your voice session."
              : isConversationMode
                ? "Hands-free mode: Speak naturally. Turn off hands-free to manually control."
                : "Speak clearly. Press Send to submit or enable hands-free mode."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
