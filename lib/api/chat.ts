export interface MessageAnalysis {
  emotionalState: string;
  themes: string[];
  riskLevel: number;
  recommendedApproach: string;
  progressIndicators: string[];
}

export interface EmotionMeta {
  emotion: "panic" | "stress" | "low" | "neutral" | "positive";
  intensity: number;
  suggestedActivity: "breathing" | "ocean" | "forest" | "zen" | null;
  autoTrigger: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    analysis?: MessageAnalysis;
    technique?: string;
    goal?: string;
    progress?: {
      emotionalState?: string;
      riskLevel?: number;
    };
    emotionMeta?: EmotionMeta;
  };
}

export interface ChatSession {
  sessionId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export interface SendMessageResponse {
  message: string;
  response?: string;
  analysis?: MessageAnalysis;
  metadata?: {
    technique?: string;
    currentGoal?: string;
    progress?: {
      emotionalState?: string;
      riskLevel?: number;
    };
    emotionMeta?: EmotionMeta;
  };
}

const API_BASE = "/api/chat";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }

  return data as T;
}

function toDate(value: unknown): Date {
  if (!value) return new Date();
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toMessage(message: any): ChatMessage {
  return {
    role: message.role,
    content: message.content,
    timestamp: toDate(message.timestamp),
    metadata: message.metadata,
  };
}

export async function createChatSession(): Promise<string> {
  const response = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  const data = await parseJson<{ sessionId: string }>(response);
  return data.sessionId;
}

export async function sendChatMessage(
  sessionId: string,
  message: string
): Promise<SendMessageResponse> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });

  return parseJson<SendMessageResponse>(response);
}

export async function sendChatMessageStream(
  sessionId: string,
  message: string
): Promise<Response> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    let errorMsg = "Request failed";
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return response;
}

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/history`, {
    headers: getAuthHeaders(),
  });

  const messages = await parseJson<any[]>(response);
  return messages.map(toMessage);
}

export async function deleteChatSession(sessionId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return parseJson<{ message: string }>(response);
}

export async function getAllChatSessions(): Promise<ChatSession[]> {
  const response = await fetch(`${API_BASE}/sessions`, {
    headers: getAuthHeaders(),
  });

  const sessions = await parseJson<any[]>(response);

  return sessions.map((session) => ({
    sessionId: session.sessionId,
    title: session.title || "New Chat",
    messages: session.lastMessage ? [{
      role: "assistant", // Approximation for preview
      content: session.lastMessage.content,
      timestamp: toDate(session.lastMessage.timestamp)
    }] : [],
    createdAt: toDate(session.startTime),
    updatedAt: toDate(session.lastMessage?.timestamp || session.startTime),
    messageCount: session.messageCount || 0
  }));
}
