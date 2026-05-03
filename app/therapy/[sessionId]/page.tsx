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

interface SuggestedQuestion {
  id: string;
  text: string;
}

interface StressPrompt {
  trigger: string;
  activity: {
    type: "breathing" | "garden" | "forest" | "waves";
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
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stressPrompt, setStressPrompt] = useState<StressPrompt | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [isChatPaused, setIsChatPaused] = useState(false);
  const [showNFTCelebration, setShowNFTCelebration] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const sessionId = params.sessionId as string;
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // 1. Initial mounting check
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Load all chat sessions (sidebar) - Only once on mount
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

  // 3. Load chat history whenever sessionId changes
  useEffect(() => {
    const loadHistory = async () => {
      if (!sessionId || sessionId === "new") {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log("Loading existing chat session:", sessionId);
        const history = await getChatHistory(sessionId);
        
        if (Array.isArray(history)) {
          const formattedHistory = history.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(formattedHistory);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
        setMessages([
          {
            role: "assistant",
            content: "I apologize, but I'm having trouble loading the chat session.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    if (mounted) {
      loadHistory();
    }
  }, [sessionId, mounted]);

  const handleNewSession = async () => {
    try {
      setIsLoading(true);
      const newSessionId = await createChatSession();
      
      // Update session list to include the new one immediately
      const allSessions = await getAllChatSessions();
      setSessions(allSessions);
      
      router.push(`/therapy/${newSessionId}`);
    } catch (error) {
      console.error("Failed to create new session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation(); // Prevent navigating to the session when clicking delete
    try {
      await deleteChatSession(idToDelete);
      
      // Update local state to remove the session instantly
      setSessions(prev => prev.filter(s => s.sessionId !== idToDelete));
      
      // If we just deleted the currently active session, navigate away
      if (sessionId === idToDelete) {
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
    console.log("Form submitted");
    const currentMessage = message.trim();
    console.log("Current message:", currentMessage);
    console.log("Session ID:", sessionId);
    console.log("Is typing:", isTyping);
    console.log("Is chat paused:", isChatPaused);

    if (!currentMessage || isTyping || isChatPaused || !sessionId) {
      console.log("Submission blocked:", {
        noMessage: !currentMessage,
        isTyping,
        isChatPaused,
        noSessionId: !sessionId,
      });
      return;
    }

    setMessage("");
    setIsThinking(true);

    try {
      // Add user message
      const userMessage: ChatMessage = {
        role: "user",
        content: currentMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      console.log("SENDING TO BACKEND:", currentMessage);
      console.log("Sending message to API...");
      
      // Add empty assistant message immediately so we can stream into it
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);
      
      const response = await sendChatMessageStream(sessionId, currentMessage);
      if (!response.body) throw new Error("No response body");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            
            if (data.t === "chunk") {
              // Hide thinking, start typing
              setIsThinking(false);
              setIsTyping(true);
              
              // Append text chunk to the last message
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content += data.d;
                return newMessages;
              });
              scrollToBottom();
            } else if (data.t === "done") {
              // Finalize message with metadata
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                lastMessage.metadata = {
                  analysis: data.analysis,
                  technique: data.metadata?.technique || "supportive",
                  goal: data.metadata?.currentGoal || "Provide support",
                  progress: data.metadata?.progress,
                  emotionMeta: data.metadata?.emotionMeta,
                };
                return newMessages;
              });

              // Auto-trigger activity modal if backend says so
              if (data.metadata?.emotionMeta?.autoTrigger && data.metadata?.emotionMeta?.suggestedActivity) {
                handleActivityTrigger(data.metadata.emotionMeta.suggestedActivity, data.metadata.emotionMeta.emotion);
              }
            }
          } catch (e) {
            console.error("Error parsing NDJSON chunk:", e);
          }
        }
      }
      
      setIsThinking(false);
      setIsTyping(false);
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
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }



  const handleActivityTrigger = (
    activityType: "breathing" | "ocean" | "forest" | "zen",
    triggerReason: string = "support"
  ) => {
    let type: "breathing" | "garden" | "forest" | "waves" = "breathing";
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
    }

    setStressPrompt({
      trigger: triggerReason,
      activity: { type, title, description },
    });
  };
  const handleSuggestedQuestion = async (text: string) => {
    let currentSessionId = sessionId;
    
    if (!currentSessionId || currentSessionId === "new") {
      try {
        setIsLoading(true);
        currentSessionId = await createChatSession();
        // Update session list
        const allSessions = await getAllChatSessions();
        setSessions(allSessions);
        // Navigation will happen, but we can also set message state before
        setMessage(text);
        router.push(`/therapy/${currentSessionId}`);
        // We don't need to manually trigger submit here because the user is now in a new session
        // They can just click send, or we can auto-submit after navigation in a useEffect
        return;
      } catch (error) {
        console.error("Failed to create session for suggested question:", error);
        setIsLoading(false);
        return;
      }
    }

    setMessage(text);
    // Submit the form
    setTimeout(() => {
      const event = new Event("submit") as unknown as React.FormEvent;
      handleSubmit(event);
    }, 0);
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
    if (selectedSessionId === sessionId) {
      setIsSidebarOpen(false);
      return;
    }
    setIsSidebarOpen(false);
    router.push(`/therapy/${selectedSessionId}`);
  };

  const currentSession = sessions.find((s) => s.sessionId === sessionId);
  const currentTitle = currentSession?.title || "New Chat";

  return (
    <div className="relative max-w-7xl mx-auto lg:px-4">
      <div className="flex h-[calc(100vh-4rem)] lg:mt-20 mt-16 lg:gap-6">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar with chat history */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 bg-background border-r flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:bg-muted/30 pt-16 lg:pt-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-4 border-b">
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

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className={cn(
                    "p-3 rounded-lg text-sm cursor-pointer hover:bg-primary/5 transition-colors",
                    session.sessionId === sessionId
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary/10"
                  )}
                  onClick={() => handleSessionSelect(session.sessionId)}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      <span className="font-medium">
                        {session.title || (session.messages && session.messages[0] ? session.messages[0].content.slice(0, 30) : "New Chat")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDeleteSession(e, session.sessionId)}
                      title="Delete session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="line-clamp-2 text-muted-foreground">
                    {session.messages[session.messages.length - 1]?.content ||
                      "No messages yet"}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {session.messageCount || 0} messages
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(session.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
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
              <div className="max-w-3xl mx-auto">
                <AnimatePresence initial={false}>
                  {messages.map((msg, index) => {
                    const isAssistant = msg.role === "assistant";
                    const defaultAiAvatar = "https://api.dicebear.com/7.x/bottts/svg?seed=Maya&backgroundColor=b6e3f4,c0aede,d1d4f9";
                    const avatarSrc = isAssistant 
                      ? (user?.aiAvatar || defaultAiAvatar)
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
                          "flex max-w-[85%] sm:max-w-[75%] gap-3",
                          isAssistant ? "flex-row" : "flex-row-reverse"
                        )}>
                          {/* Avatar */}
                          <div className="w-10 h-10 shrink-0 mt-1">
                            {isAssistant ? (
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20 shadow-md overflow-hidden">
                                <img src={avatarSrc!} alt="AI" className="w-full h-full object-cover" />
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
                          <div className="space-y-1 flex flex-col">
                            <div className={cn(
                              "p-4 rounded-2xl shadow-sm",
                              isAssistant 
                                ? "bg-muted/50 text-foreground rounded-tl-none border border-muted" 
                                : "bg-primary text-primary-foreground rounded-tr-none"
                            )}>
                              <div className={cn(
                                "prose prose-sm leading-relaxed",
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
                                        msg.metadata.emotionMeta.suggestedActivity === 'zen' ? 'Zen Garden' :
                                        msg.metadata.emotionMeta.suggestedActivity === 'forest' ? 'Forest Walk' :
                                        msg.metadata.emotionMeta.suggestedActivity === 'ocean' ? 'Ocean Waves' :
                                        'Breathing'
                                      }
                                   </Button>
                                </div>
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
                        <img 
                          src={user?.aiAvatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Maya&backgroundColor=b6e3f4,c0aede,d1d4f9"} 
                          alt="AI" 
                          className="w-full h-full object-cover" 
                        />
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
                    isChatPaused
                      ? "Complete the activity to continue..."
                      : "Ask me anything..."
                  }
                  className={cn(
                    "w-full resize-none rounded-2xl border bg-background",
                    "p-3 pr-12 min-h-[48px] max-h-[200px]",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50",
                    "transition-all duration-200",
                    "placeholder:text-muted-foreground/70",
                    (isTyping || isChatPaused) &&
                      "opacity-50 cursor-not-allowed"
                  )}
                  rows={1}
                  disabled={isTyping || isChatPaused}
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
                    (isTyping || isChatPaused || !message.trim()) &&
                      "opacity-50 cursor-not-allowed",
                    "group-hover:scale-105 group-focus-within:scale-105"
                  )}
                  disabled={isTyping || isChatPaused || !message.trim()}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
