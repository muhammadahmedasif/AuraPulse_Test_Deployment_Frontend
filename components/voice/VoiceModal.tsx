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
import { cn } from "@/lib/utils";
import { sendChatMessageStream, createChatSession } from "@/lib/api/chat";
import {
  AlertCircle,
  Send,
  Zap,
  MessageSquarePlus,
  Loader2,
  X,
  History,
  Volume2,
  Mic,
  Settings2,
  AudioWaveform
} from "lucide-react";

// --- Visual Components ---

const VoiceAura = ({ state, activityActive }: { state: string; activityActive: boolean }) => {
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isProcessing = state === "processing";

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      {/* Pulse Rings */}
      <AnimatePresence>
        {(isListening || isSpeaking || isProcessing) && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0, 0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-primary/20"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: [0.9, 1.5, 0.9], opacity: [0, 0.3, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute inset-0 rounded-full bg-primary/10"
            />
          </>
        )}
      </AnimatePresence>

      {/* Central Circle */}
      <motion.div
        animate={{
          scale: isListening ? [1, 1.05, 1] : 1,
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className={cn(
          "relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 border-4 shadow-sm",
          activityActive ? "bg-muted border-muted-foreground/20" :
            isListening ? "bg-primary border-primary/20 shadow-primary/20" :
              isSpeaking ? "bg-secondary border-secondary/20 shadow-secondary/20" :
                isProcessing ? "bg-primary/80 border-primary/20 animate-pulse" :
                  "bg-background border-border"
        )}
      >
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <Loader2 key="proc" className="w-10 h-10 text-primary-foreground animate-spin" />
          ) : isSpeaking ? (
            <Volume2 key="speak" className="w-10 h-10 text-secondary-foreground" />
          ) : (
            <Mic key="mic" className={cn("w-10 h-10", isListening ? "text-primary-foreground" : "text-muted-foreground")} />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

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
  const [showHistory, setShowHistory] = useState(false);

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
        if (activityActive) return;
        handleClose();
      }}
    >
      <DialogContent
        className={cn(
          "sm:max-w-[850px] w-[95vw] h-[600px] max-h-[90vh] p-0 overflow-hidden transition-all duration-300 rounded-[--radius] bg-background border-border shadow-2xl flex flex-col",
          activityActive ? "pointer-events-none opacity-50 scale-[0.98]" : ""
        )}
        overlayClassName={cn(activityActive && "pointer-events-none")}
        onInteractOutside={(e) => { if (activityActive) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (activityActive) e.preventDefault(); }}
      >
          {/* Header Area - Matched with App Branding */}
          <div className="flex items-center justify-between p-5 border-b bg-background/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center space-x-2">
              <AudioWaveform className="h-7 w-7 text-primary animate-pulse-gentle" />
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-lg bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent leading-none">
                  AuraPulse
                </span>
                <span className="text-[11px] text-muted-foreground tracking-tight">
                  Your mental health Companion
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Main Interaction Side (Left) - Stable Layout */}
            <div className="flex-[1.2] flex flex-col items-center justify-between p-8 border-r border-border/50 h-full overflow-hidden">
              <div className="flex-1 flex items-center justify-center">
                <button
                  onClick={handleMicClick}
                  disabled={isStreaming || isConversationMode || activityActive}
                  className="cursor-pointer outline-none focus:ring-0 transition-transform active:scale-95"
                >
                  <VoiceAura state={voice.state} activityActive={activityActive} />
                </button>
              </div>

              <div className="w-full max-w-sm h-48 flex flex-col items-center justify-start text-center overflow-y-auto scrollbar-sleek px-2 shrink-0">
                <AnimatePresence mode="wait">
                  {isStreaming || aiResponse ? (
                    <motion.div
                      key="ai"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1 py-2"
                    >
                      <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] sticky top-0 bg-background/80 backdrop-blur-sm py-1">AuraPulse Speaking</p>
                      <p className="text-lg font-medium text-foreground leading-snug">
                        {aiResponse || "Processing..."}
                      </p>
                    </motion.div>
                  ) : voice.transcript ? (
                    <motion.div
                      key="user"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-1 py-2"
                    >
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] sticky top-0 bg-background/80 backdrop-blur-sm py-1">You said</p>
                      <p className="text-lg font-medium text-foreground leading-snug italic">
                        "{voice.transcript}"
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="idle" className="text-muted-foreground py-8">
                      {activityActive ? (
                        <p className="text-base font-medium opacity-60">Activity in progress...</p>
                      ) : isConversationMode ? (
                        <p className="text-base font-medium flex items-center justify-center gap-2 text-primary">
                          <Zap className="w-4 h-4 fill-current" />
                          Hands-free active
                        </p>
                      ) : (
                        <p className="text-base font-medium">Tap the mic to begin</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* History Side (Right) - Fixed Scroll Area */}
            <div className="flex-1 flex flex-col bg-muted/20">
              <div className="p-4 border-b flex items-center gap-2 bg-muted/40 shrink-0">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-[12px] font-bold text-muted-foreground tracking-[0.15em]">Conversation History</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-sleek">
                {messageHistory.length > 0 ? (
                  messageHistory.map((msg, idx) => (
                    <div key={idx} className={cn(
                      "flex flex-col gap-1",
                      msg.role === "user" ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "max-w-[85%] px-4 py-2 rounded-[0.75rem] text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none shadow-sm"
                          : "bg-background border border-border/50 text-foreground rounded-tl-none shadow-sm"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale space-y-3 p-8">
                    <MessageSquarePlus className="w-10 h-10" />
                    <p className="text-[11px] font-bold uppercase tracking-widest">No history yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Control Bar - Fixed Height */}
          <div className="p-5 border-t bg-background/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isConversationMode ? "default" : "outline"}
                size="lg"
                onClick={handleToggleConversationMode}
                className={cn(
                  "rounded-full px-8 gentle-shadow transition-all",
                  isConversationMode && "bg-primary hover:bg-primary/90"
                )}
                disabled={activityActive}
              >
                <Zap className={cn("w-4 h-4 mr-2", isConversationMode && "fill-current")} />
                {isConversationMode ? "Hands-Free On" : "Hands-Free Mode"}
              </Button>

              {!isConversationMode && voice.transcript && (
                <Button
                  onClick={handleManualSend}
                  disabled={isStreaming || activityActive}
                  size="lg"
                  className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground gentle-shadow"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              )}

              <Button
                variant="outline"
                size="lg"
                onClick={handleNewChat}
                disabled={isCreatingNewChat || activityActive}
                className="rounded-full px-8 hover-lift"
              >
                {isCreatingNewChat ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageSquarePlus className="w-4 h-4 mr-2" />}
                New Chat
              </Button>
            </div>
          </div>

        {/* Error Display Overlay */}
        {(voice.error || streamError) && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
            <Alert variant="destructive" className="shadow-lg border-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{voice.error || streamError}</AlertDescription>
            </Alert>
          </div>
        )}
      </DialogContent>
      <style jsx global>{`
        .scrollbar-sleek::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-sleek::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-sleek::-webkit-scrollbar-thumb {
          background: rgba(var(--primary), 0.1);
          border-radius: 10px;
        }
        .scrollbar-sleek::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--primary), 0.2);
        }
      `}</style>
    </Dialog>
  );
}
