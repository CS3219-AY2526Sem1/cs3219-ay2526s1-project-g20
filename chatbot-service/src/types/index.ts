export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  context?: Record<string, any>;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  success: boolean;
  data: {
    response: string;
    conversationId: string;
    timestamp: Date;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  message?: string;
}

export interface Conversation {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface ChatbotConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
  systemPrompt: string;
}

export enum ChatbotMode {
  CODING = "coding",
  EXPLANATION = "explanation",
  HINT = "hint",
  GENERAL = "general",
}

export interface ChatbotRequest {
  message: string;
  conversationId?: string;
  mode?: ChatbotMode;
  context?: {
    questionId?: string;
    difficulty?: string;
    category?: string;
    code?: string;
  };
}

