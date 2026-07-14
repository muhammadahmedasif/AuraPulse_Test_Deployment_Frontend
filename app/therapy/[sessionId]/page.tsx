"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Send,
  Bot,
  User as UserIcon,
  Loader2,
  Sparkles,
  X,
  Trophy,
  Star,
  Clock,
  Smile,
  PlusCircle,
  MessageSquare,
  Trash2,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BreathingGame } from "@/components/games/breathing-game";
import { ZenGarden } from "@/components/games/zen-garden";
import { ForestGame } from "@/components/games/forest-game";
import { OceanWaves } from "@/components/games/ocean-waves";
import { RainGame } from "@/components/games/rain-game";
import { CampfireGame } from "@/components/games/campfire-game";
import { SpotifyCard } from "@/components/music/spotify-card";
import { Badge } from "@/components/ui/badge";
import {
  createChatSession,
  sendChatMessage,
  sendChatMessageStream,
  getChatHistory,
  ChatMessage,
  getAllChatSessions,
  ChatSession,
  deleteChatSession,
} from "@/lib/api/chat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/lib/contexts/session-context";

import { AutoMoodDetector } from "@/components/face-emotion/AutoMoodDetector";
import { trackMood } from "@/lib/api/mood";
import { Video, VideoOff } from "lucide-react";

interface SuggestedQuestion {
  id: string;
  text: string;
}

interface StressPrompt {
  trigger: string;
  activity: {
    type: "breathing" | "garden" | "forest" | "waves" | "rain" | "campfire";
    title: string;
    description: string;
  };
}

interface ApiResponse {
  message: string;
  metadata: {
    technique: string;
    goal: string;
    progress: any[];
  };
}

const SUGGESTED_QUESTIONS = [
  { text: "How can I manage my anxiety better?" },
  { text: "I've been feeling overwhelmed lately" },
  { text: "Can we talk about improving sleep?" },
  { text: "I need help with work-life balance" },
];

const glowAnimation = {
  initial: { opacity: 0.5, scale: 1 },
  animate: {
    opacity: [0.5, 1, 0.5],
    scale: [1, 1.05, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const COMPLETION_THRESHOLD = 5;

export default function TherapyPage() {
  const { user } = useSession();
  const params = useParams();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const messagesSessionIdRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef<string>("new");
  const optimisticSessionIdRef = useRef<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stressPrompt, setStressPrompt] = useState<StressPrompt | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [isChatPaused, setIsChatPaused] = useState(false);
  const [showNFTCelebration, setShowNFTCelebration] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isAutoMoodEnabled, setIsAutoMoodEnabled] = useState(false);

  // SINGLE SOURCE OF TRUTH: activeSessionId state (replaces stale params.sessionId)
  const [activeSessionId, setActiveSessionId] = useState<string>("new");
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // 1. Initial mounting check
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2a. Sync URL params to activeSessionId state (single source of truth)
  // This ensures activeSessionId stays in sync with actual URL
  useEffect(() => {
    const pathSessionId = window.location.pathname
      .replace(/^\/therapy\/?/, "")
      .split("/")[0];
    const newSessionId = pathSessionId || (params.sessionId as string);

    if (newSessionId && newSessionId !== activeSessionId) {
      setActiveSessionId(newSessionId);
    }
  }, [params.sessionId, activeSessionId]);

  // 2b. Load all chat sessions (sidebar) - Only once on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const allSessions = await getAllChatSessions();
        setSessions(allSessions);
      } catch (error) {
        console.error("Failed to load sessions:", error);
      }
    };

    if (mounted) {
      loadSessions();
    }
  }, [mounted]);

  // 3. Load chat history whenever activeSessionId changes
  // Uses activeSessionId (state) instead of sessionId (stale params)
  useEffect(() => {
    const loadHistory = async () => {
      const requestedSessionId = activeSessionId;

      if (!activeSessionId || activeSessionId === "new") {
        // If we're on "new" session, check for prefill in URL
        const searchParams = new URLSearchParams(window.location.search);
        const prefill = searchParams.get("prefill");
        if (prefill) {
          setMessage(prefill);
          // Clear query param
          window.history.replaceState(null, "", window.location.pathname);
        }

        // Clear messages when navigating back to /therapy/new from an existing chat.
        if (messagesSessionIdRef.current !== "new") {
          messagesSessionIdRef.current = "new";
          setMessages([]);
        }
        setIsLoading(false);
        return;
      }

      // Skip history load only when the current messages belong to this session.
      if (
        optimisticSessionIdRef.current === requestedSessionId ||
        messagesSessionIdRef.current === requestedSessionId &&
        messagesRef.current.length > 0
      ) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        if (messagesSessionIdRef.current !== requestedSessionId) {
          setMessages([]);
        }
        const history = await getChatHistory(requestedSessionId);

        // Do not let a stale history request overwrite a newer navigation or
        // the optimistic first exchange after /therapy/new creates a session.
        if (activeSessionIdRef.current !== requestedSessionId) {
          return;
        }

        if (
          optimisticSessionIdRef.current === requestedSessionId ||
          messagesSessionIdRef.current === requestedSessionId &&
          messagesRef.current.length > 0
        ) {
          return;
        }

        if (Array.isArray(history)) {
          const formattedHistory = history.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          messagesSessionIdRef.current = requestedSessionId;
          setMessages(formattedHistory);
        } else {
          messagesSessionIdRef.current = requestedSessionId;
          setMessages([]);
        }
      } catch (error: any) {
        if (activeSessionIdRef.current !== requestedSessionId) {
          return;
        }

        console.error("Failed to load chat history:", error);
        const errMsg = error?.message || "";
        const content = (errMsg.includes("not found") || errMsg.includes("archived") || errMsg.includes("404"))
          ? "This chat session has been archived by the administrator and is no longer accessible."
          : "I apologize, but I'm having trouble loading the chat session.";
        messagesSessionIdRef.current = requestedSessionId;
        setMessages([
          {
            role: "assistant",
            content,
            timestamp: new Date(),
          },
        ]);
      } finally {
        if (activeSessionIdRef.current === requestedSessionId) {
          setIsLoading(false);
        }
      }
    };
    if (mounted) {
      loadHistory();
    }
  }, [activeSessionId, mounted]);

  const handleNewSession = () => {
    router.push("/therapy/new");
  };

  const handleDeleteSession = async (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation();
    try {
      await deleteChatSession(idToDelete);

      // Update local state to remove the session instantly
      setSessions((prev) => prev.filter((s) => s.sessionId !== idToDelete));

      // If we just deleted the currently active session, navigate away
      if (activeSessionId === idToDelete) {
        router.push("/therapy/new");
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  useEffect(() => {
    if (!isTyping) {
      scrollToBottom();
    }
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentMessage = message.trim();

    // Prevent submission if conditions not met or session creation in progress
    if (!currentMessage || isTyping || isChatPaused || isSessionLocked || isCreatingSession) {
      return;
    }

    const isNewSession = activeSessionId === "new";
    let targetSessionId = activeSessionId;

    setMessage("");
    setIsThinking(true);

    try {
      const userMessage: ChatMessage = {
        role: "user",
        content: currentMessage,
        timestamp: new Date(),
      };
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      const optimisticSessionId = isNewSession ? `pending-${Date.now()}` : targetSessionId;
      const shouldAppendToCurrentMessages =
        messagesSessionIdRef.current === optimisticSessionId;
      optimisticSessionIdRef.current = optimisticSessionId;
      messagesSessionIdRef.current = optimisticSessionId;
      setMessages((prev) => {
        const nextMessages = shouldAppendToCurrentMessages ? prev : [];
        return [...nextMessages, userMessage, assistantMessage];
      });

      // Create session only if we're on "new" and not already creating
      if (isNewSession) {
        setIsCreatingSession(true);
        try {
          // 1. Create session in backend
          const newId = await createChatSession();
          targetSessionId = newId;
          messagesSessionIdRef.current = newId;
          optimisticSessionIdRef.current = newId;
          activeSessionIdRef.current = newId;

          // 2. Keep local state and the URL in sync without remounting the page.
          setActiveSessionId(newId);
          window.history.replaceState(null, "", `/therapy/${newId}`);

          // 3. Refresh sidebar in background
          getAllChatSessions().then(setSessions).catch(console.error);
        } catch (error) {
          console.error("Failed to initialize session:", error);
          setIsThinking(false);
          setIsCreatingSession(false);
          return;
        } finally {
          setIsCreatingSession(false);
        }
      }

      optimisticSessionIdRef.current = targetSessionId;
      messagesSessionIdRef.current = targetSessionId;

      // Stream the message to the correct session
      const response = await sendChatMessageStream(targetSessionId, currentMessage);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleStreamLine = (line: string) => {
        if (!line.trim()) return;

        try {
          const data = JSON.parse(line);

          if (data.t === "chunk") {
            // Hide thinking, start typing
            setIsThinking(false);
            setIsTyping(true);

            // Append text chunk to the last message
            setMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage?.role === "assistant") {
                newMessages[newMessages.length - 1] = {
                  ...lastMessage,
                  content: lastMessage.content + data.d,
                };
              }
              return newMessages;
            });
            scrollToBottom();
          } else if (data.t === "done") {
            // Finalize message with metadata (including Spotify recommendations)
            setMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage?.role === "assistant") {
                newMessages[newMessages.length - 1] = {
                  ...lastMessage,
                  metadata: {
                    analysis: data.analysis,
                    technique: data.metadata?.technique || "supportive",
                    goal: data.metadata?.currentGoal || "Provide support",
                    progress: data.metadata?.progress,
                    emotionMeta: data.metadata?.emotionMeta,
                    spotifyRecommendations: data.metadata?.spotifyRecommendations || undefined,
                  },
                };
              }
              return newMessages;
            });

            // Auto-trigger activity modal if backend says so
            if (
              data.metadata?.emotionMeta?.suggestedActivity
            ) {
              handleActivityTrigger(
                data.metadata.emotionMeta.suggestedActivity,
                data.metadata.emotionMeta.emotion
              );
            }
          }
        } catch (e) {
          console.error("Error parsing NDJSON chunk:", e);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          handleStreamLine(line);
        }
      }
      handleStreamLine(buffer);

      setIsThinking(false);
      setIsTyping(false);
      optimisticSessionIdRef.current = null;
      getAllChatSessions().then(setSessions).catch(console.error);
      scrollToBottom();
    } catch (error) {
      console.error("Error in chat:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
      setIsThinking(false);
      setIsTyping(false);
      optimisticSessionIdRef.current = null;
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleActivityTrigger = (
    activityType: "breathing" | "ocean" | "forest" | "zen" | "rain" | "campfire",
    triggerReason: string = "support"
  ) => {
    let type: "breathing" | "garden" | "forest" | "waves" | "rain" | "campfire" = "breathing";
    let title = "Calming Activity";
    let description = "Take a moment to center yourself";

    switch (activityType) {
      case "breathing":
        type = "breathing";
        title = "Breathing Patterns";
        description = "Follow calming breathing exercises with visual guidance";
        break;
      case "ocean":
        type = "waves";
        title = "Ocean Waves";
        description = "Match your breath with gentle ocean waves";
        break;
      case "forest":
        type = "forest";
        title = "Mindful Forest";
        description = "Take a peaceful walk through a virtual forest";
        break;
      case "zen":
        type = "garden";
        title = "Zen Garden";
        description = "Create and maintain your digital peaceful space";
        break;
      case "rain":
        type = "rain";
        title = "Gentle Rain";
        description = "Drift into calm with the soothing sound of rainfall";
        break;
      case "campfire":
        type = "campfire";
        title = "Campfire Night";
        description = "Unwind by a crackling fire under a starry sky";
        break;
    }

    setStressPrompt({
      trigger: triggerReason,
      activity: { type, title, description },
    });
  };
  const handleSuggestedQuestion = (text: string) => {
    if (activeSessionId === "new") {
      setMessage(text);
    } else {
      router.push(`/therapy/new?prefill=${encodeURIComponent(text)}`);
    }
  };

  const handleCompleteSession = async () => {
    if (isCompletingSession) return;
    setIsCompletingSession(true);
    try {
      setShowNFTCelebration(true);
    } catch (error) {
      console.error("Error completing session:", error);
    } finally {
      setIsCompletingSession(false);
    }
  };

  const handleSessionSelect = async (selectedSessionId: string) => {
    if (selectedSessionId === activeSessionId) {
      setIsSidebarOpen(false);
      return;
    }
    setIsSidebarOpen(false);
    router.push(`/therapy/${selectedSessionId}`);
  };

  const handleAutoMoodShift = async (score: number, mood: string) => {
    try {
      // Save it silently
      await trackMood({ score, source: "camera", mood });
      
      // Inject system message to prompt AI, only if we are in an active chat
      if (activeSessionId && activeSessionId !== "new" && !isTyping && !isThinking) {
        const systemPrompt = `[SYSTEM_NOTE: The camera has auto-detected a mood shift to ${mood}. Please gently ask the user how they are feeling right now.]`;
        
        setIsThinking(true);
        
        // Optimistically add system message
        const userMessage: ChatMessage = {
          role: "user",
          content: systemPrompt,
          timestamp: new Date(),
        };
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: "",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage, assistantMessage]);
        
        // Stream the message
        const response = await sendChatMessageStream(activeSessionId, systemPrompt);
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handleStreamLine = (line: string) => {
          if (!line.trim()) return;
          try {
            const data = JSON.parse(line);
            if (data.t === "chunk") {
              setIsThinking(false);
              setIsTyping(true);
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === "assistant") {
                  newMessages[newMessages.length - 1] = {
                    ...lastMessage,
                    content: lastMessage.content + data.d,
                  };
                }
                return newMessages;
              });
              scrollToBottom();
            } else if (data.t === "done") {
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === "assistant") {
                  newMessages[newMessages.length - 1] = {
                    ...lastMessage,
                    metadata: {
                      analysis: data.analysis,
                      technique: data.metadata?.technique || "supportive",
                      goal: data.metadata?.currentGoal || "Provide support",
                      progress: data.metadata?.progress,
                      emotionMeta: data.metadata?.emotionMeta,
                    },
                  };
                }
                return newMessages;
              });
            }
          } catch (e) {
            console.error(e);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            handleStreamLine(line);
          }
        }
        handleStreamLine(buffer);
        setIsThinking(false);
        setIsTyping(false);
        scrollToBottom();
      }
    } catch (e) {
      console.error("Auto mood shift handle error:", e);
      setIsThinking(false);
      setIsTyping(false);
    }
  };

  const currentSession = sessions.find((s) => s.sessionId === activeSessionId);
  const currentTitle = currentSession?.title || "New Chat";
  const isSessionLocked = currentSession?.status === "completed" || currentSession?.status === "archived";

  return (
    <div className="relative max-w-7xl mx-auto lg:px-4">
      <div className="flex h-[calc(100vh-4rem)] lg:mt-20 mt-16 lg:gap-6">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar with chat history */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-40 w-80 bg-background border-r flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:bg-muted/30 lg:pt-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          "pt-16"
        )}>
          <div className="p-4 border-b shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Chat Sessions</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewSession}
                className="hover:bg-primary/10"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <PlusCircle className="w-5 h-5" />
                )}
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleNewSession}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageSquare className="w-4 h-4" />
              )}
              New Session
            </Button>
          </div>

          <div className="flex-1 min-h-0 p-4">
            <div className="h-full overflow-y-auto space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={cn(
                    "p-3 rounded-lg text-sm cursor-pointer hover:bg-primary/5 transition-colors",
                    session.sessionId === activeSessionId
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary/10"
                  )}
                  onClick={() => handleSessionSelect(session.sessionId)}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="font-medium truncate">
                        {session.title || (session.messages && session.messages[0] ? session.messages[0].content.slice(0, 30) : "New Chat")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDeleteSession(e, session.sessionId)}
                      title="Delete session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="line-clamp-2 text-muted-foreground break-words">
                    {session.messages[session.messages.length - 1]?.content ||
                      "No messages yet"}
                  </p>
                  <div className="flex items-center justify-between mt-2 min-w-0 gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {session.messageCount || 0} messages
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(session.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-background rounded-lg border">
          {/* Chat header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden mr-2"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold">{currentTitle}</h2>
                <p className="text-sm text-muted-foreground">
                  AI Therapist • {messages.length} messages
                </p>
              </div>
            </div>

            {/* Auto Mood Toggle & Detector */}
            <div className="flex items-center gap-2">
              <Button
                variant={isAutoMoodEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setIsAutoMoodEnabled(!isAutoMoodEnabled)}
                className="h-8 text-xs gap-1"
                title="Automatically detect mood in background"
              >
                {isAutoMoodEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                <span className="hidden sm:inline">Auto Mood</span>
              </Button>
              <AutoMoodDetector 
                isActive={isAutoMoodEnabled && activeSessionId !== "new"} 
                intervalMinutes={1} 
                onMoodShiftDetected={handleAutoMoodShift} 
              />
            </div>
          </div>

          {messages.length === 0 ? (
            // Welcome screen with suggested questions
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="max-w-2xl w-full space-y-8">
                <div className="text-center space-y-4">
                  <div className="relative inline-flex flex-col items-center">
                    <motion.div
                      className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"
                      initial="initial"
                      animate="animate"
                      variants={glowAnimation}
                    />
                    <div className="relative flex items-center gap-2 text-2xl font-semibold">
                      <div className="relative">
                        <Sparkles className="w-6 h-6 text-primary" />
                        <motion.div
                          className="absolute inset-0 text-primary"
                          initial="initial"
                          animate="animate"
                          variants={glowAnimation}
                        >
                          <Sparkles className="w-6 h-6" />
                        </motion.div>
                      </div>
                      <span className="bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">
                        AI Therapist
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-2">
                      How can I assist you today?
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 relative">
                  <motion.div
                    className="absolute -inset-4 bg-gradient-to-b from-primary/5 to-transparent blur-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  />
                  {SUGGESTED_QUESTIONS.map((q, index) => (
                    <motion.div
                      key={q.text}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 + 0.5 }}
                    >
                      <Button
                        variant="outline"
                        className="w-full h-auto py-4 px-6 text-left justify-start hover:bg-muted/50 hover:border-primary/50 transition-all duration-300"
                        onClick={() => handleSuggestedQuestion(q.text)}
                      >
                        {q.text}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Chat messages
            <div className="flex-1 overflow-y-auto scroll-smooth">
              <div className="max-w-3xl mx-auto px-4 py-6">
                <AnimatePresence initial={false}>
                  {messages
                    .filter(msg => !(msg.role === "user" && msg.content.startsWith("[SYSTEM_NOTE:")))
                    .map((msg, index) => {
                    const isAssistant = msg.role === "assistant";
                    const avatarSrc = isAssistant 
                      ? user?.aiAvatar
                      : user?.profileImage;
                    const displayName = isAssistant ? (user?.aiName || "Maya") : (user?.name || "User");

                    return (
                      <motion.div
                        key={`${msg.timestamp.toISOString()}-${msg.role}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          "flex w-full mb-6",
                          isAssistant ? "justify-start" : "justify-end"
                        )}
                      >
                        <div className={cn(
                          "flex max-w-[85%] sm:max-w-[75%] gap-3 min-w-0",
                          isAssistant ? "flex-row" : "flex-row-reverse"
                        )}>
                          {/* Avatar */}
                          <div className="w-10 h-10 shrink-0 mt-1">
                            {isAssistant ? (
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20 shadow-md overflow-hidden">
                                {avatarSrc ? (
                                  <img src={avatarSrc} alt="AI" className="w-full h-full object-cover" />
                                ) : (
                                  <Bot className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary text-secondary-foreground flex items-center justify-center ring-2 ring-secondary/20 shadow-md">
                                {avatarSrc ? (
                                  <img src={avatarSrc} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                  <UserIcon className="w-5 h-5" />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Message Bubble */}
                          <div className="space-y-1 flex flex-col min-w-0 w-full">
                            <div className={cn(
                              "p-4 rounded-2xl shadow-sm min-w-0 break-words",
                              isAssistant 
                                ? "bg-muted/50 text-foreground rounded-tl-none border border-muted" 
                                : "bg-primary text-primary-foreground rounded-tr-none"
                            )}>
                              <div className={cn(
                                "prose prose-sm leading-relaxed min-w-0 break-words",
                                isAssistant ? "dark:prose-invert" : "prose-invert"
                              )}>
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>

                              {/* Emotion Suggestion UI */}
                              {isAssistant && msg.metadata?.emotionMeta?.suggestedActivity && (
                                <div className="mt-4 p-3 rounded-xl border border-primary/20 bg-primary/5">
                                   <p className="font-medium text-xs text-primary mb-2 flex items-center gap-2">
                                      <Sparkles className="w-3 h-3" />
                                      Try a calming exercise?
                                   </p>
                                   <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="w-full bg-background/50 hover:bg-primary/10 h-8 text-xs"
                                      onClick={() => handleActivityTrigger(msg.metadata?.emotionMeta?.suggestedActivity as any, msg.metadata?.emotionMeta?.emotion)}
                                   >
                                      Start {
                                        (msg.metadata.emotionMeta.suggestedActivity as string) === 'zen' ? 'Zen Garden' :
                                        (msg.metadata.emotionMeta.suggestedActivity as string) === 'forest' ? 'Forest Walk' :
                                        (msg.metadata.emotionMeta.suggestedActivity as string) === 'ocean' ? 'Ocean Waves' :
                                        (msg.metadata.emotionMeta.suggestedActivity as string) === 'rain' ? 'Gentle Rain' :
                                        (msg.metadata.emotionMeta.suggestedActivity as string) === 'campfire' ? 'Campfire Night' :
                                        'Breathing'
                                      }
                                   </Button>
                                </div>
                              )}

                              {/* Spotify Music Recommendations */}
                              {isAssistant && msg.metadata?.spotifyRecommendations && msg.metadata.spotifyRecommendations.length > 0 && (
                                <SpotifyCard 
                                  playlists={msg.metadata.spotifyRecommendations}
                                  reason={msg.metadata?.emotionMeta ? `Suggested for your ${msg.metadata.emotionMeta.emotion} mood` : undefined}
                                />
                              )}
                            </div>

                            {/* Metadata */}
                            <div className={cn(
                              "flex items-center gap-2 px-1",
                              isAssistant ? "justify-start" : "justify-end"
                            )}>
                              {isAssistant && msg.metadata?.technique && (
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                  {msg.metadata.technique}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground opacity-70">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {(isThinking || isTyping) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-6 py-6 flex gap-4 bg-muted/30 border-t border-muted"
                  >
                    <div className="w-10 h-10 shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20 shadow-md overflow-hidden">
                        {user?.aiAvatar ? (
                          <img 
                            src={user.aiAvatar} 
                            alt="AI" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <Bot className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-semibold text-primary/80 ml-1">
                        {user?.aiName || "Maya"} is {isThinking ? "gathering thoughts" : "typing"}...
                      </p>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="border-t bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/50 p-4">
            <form
              onSubmit={handleSubmit}
              className="max-w-3xl mx-auto flex gap-4 items-end relative"
            >
              <div className="flex-1 relative group">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    isSessionLocked
                      ? "This session has been completed and is locked."
                      : isChatPaused
                      ? "Complete the activity to continue..."
                      : "Ask me anything..."
                  }
                  className={cn(
                    "w-full resize-none rounded-2xl border bg-background",
                    "p-3 pr-12 min-h-[48px] max-h-[200px]",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50",
                    "transition-all duration-200",
                    "placeholder:text-muted-foreground/70",
                    (isTyping || isChatPaused || isSessionLocked) &&
                      "opacity-50 cursor-not-allowed"
                  )}
                  rows={1}
                  disabled={isTyping || isChatPaused || isSessionLocked}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  className={cn(
                    "absolute right-1.5 bottom-3.5 h-[36px] w-[36px]",
                    "rounded-xl transition-all duration-200",
                    "bg-primary hover:bg-primary/90",
                    "shadow-sm shadow-primary/20",
                    (isTyping || isChatPaused || isSessionLocked || !message.trim()) &&
                      "opacity-50 cursor-not-allowed",
                    "group-hover:scale-105 group-focus-within:scale-105"
                  )}
                  disabled={isTyping || isChatPaused || isSessionLocked || !message.trim()}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit(e);
                  }}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
            <div className="mt-2 text-xs text-center text-muted-foreground">
              Press <kbd className="px-2 py-0.5 rounded bg-muted">Enter ↵</kbd>{" "}
              to send,
              <kbd className="px-2 py-0.5 rounded bg-muted ml-1">
                Shift + Enter
              </kbd>{" "}
              for new line
            </div>
            </div>
          </div>
        </div>

      {/* Interactive Activity Modal Overlay */}
      {stressPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-background rounded-xl border shadow-lg flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div>
                <h3 className="text-lg font-semibold">{stressPrompt.activity.title}</h3>
                <p className="text-sm text-muted-foreground">{stressPrompt.activity.description}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full shrink-0"
                onClick={() => setStressPrompt(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-4 flex-1">
              {stressPrompt.activity.type === "breathing" && <BreathingGame />}
              {stressPrompt.activity.type === "waves" && <OceanWaves />}
              {stressPrompt.activity.type === "forest" && <ForestGame />}
              {stressPrompt.activity.type === "garden" && <ZenGarden />}
              {stressPrompt.activity.type === "rain" && <RainGame />}
              {stressPrompt.activity.type === "campfire" && <CampfireGame />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
