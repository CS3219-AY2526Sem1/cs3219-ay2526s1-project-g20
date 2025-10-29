import axios, { AxiosInstance } from "axios";
import {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  Conversation,
  ChatbotMode,
  ChatbotRequest,
} from "../types";
import { v4 as uuidv4 } from "uuid";

class ChatbotService {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private axiosInstance: AxiosInstance;
  private conversations: Map<string, Conversation> = new Map();

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    this.model = process.env.CHATBOT_MODEL || "gpt-4";

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      timeout: 30000, // 30 seconds timeout
    });
  }

  private getSystemPrompt(mode?: ChatbotMode, context?: any): string {
    const basePrompt =
      "You are a helpful AI assistant for PeerPrep, a coding practice platform.";

    if (!mode) {
      return basePrompt;
    }

    switch (mode) {
      case ChatbotMode.CODING:
        return `${basePrompt} You are an expert coding assistant. Help users with their code, provide solutions, and explain programming concepts. Current context: ${JSON.stringify(
          context || {}
        )}`;

      case ChatbotMode.EXPLANATION:
        return `${basePrompt} You are an expert at explaining coding problems and solutions. Provide clear, detailed explanations.`;

      case ChatbotMode.HINT:
        return `${basePrompt} You are a helpful guide. Provide hints and guidance to help users solve problems without giving away the complete solution.`;

      case ChatbotMode.GENERAL:
      default:
        return basePrompt;
    }
  }

  async sendMessage(request: ChatbotRequest): Promise<ChatResponse> {
    try {
      const {
        message,
        conversationId,
        mode = ChatbotMode.GENERAL,
        context,
      } = request;

      // Validate message
      if (!message || message.trim().length === 0) {
        throw new Error("Message cannot be empty");
      }

      // Get or create conversation
      let conversation: Conversation;
      if (conversationId && this.conversations.has(conversationId)) {
        conversation = this.conversations.get(conversationId)!;
      } else {
        const newConversationId = uuidv4();
        conversation = {
          id: newConversationId,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.conversations.set(newConversationId, conversation);
      }

      // Add user message
      const userMessage: ChatMessage = {
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      conversation.messages.push(userMessage);

      // Build messages array for API
      const messages: any[] = [
        {
          role: "system",
          content: this.getSystemPrompt(mode, context),
        },
        ...conversation.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      // Call OpenAI API (mock for now - replace with actual API call)
      const response = await this.callOpenAI(messages);

      // Add assistant message to conversation
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
      };
      conversation.messages.push(assistantMessage);
      conversation.updatedAt = new Date();

      return {
        success: true,
        data: {
          response: response.response,
          conversationId: conversation.id,
          timestamp: new Date(),
          usage: response.usage,
        },
      };
    } catch (error: any) {
      console.error("Error in sendMessage:", error);
      throw new Error(error.message || "Failed to send message");
    }
  }

  private async callOpenAI(messages: any[]): Promise<any> {
    try {
      // Mock response for development
      // Replace this with actual OpenAI API call when you have API key
      if (!this.apiKey || this.apiKey === "") {
        console.warn("OpenAI API key not set. Using mock response.");
        return {
          response:
            "Hello! I'm an AI chatbot assistant. To enable full functionality, please configure your OpenAI API key.",
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
        };
      }

      const response = await this.axiosInstance.post("/chat/completions", {
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return {
        response: response.data.choices[0].message.content,
        usage: response.data.usage,
      };
    } catch (error: any) {
      console.error("OpenAI API error:", error.response?.data || error.message);
      throw new Error("Failed to communicate with AI service");
    }
  }

  getConversation(conversationId: string): Conversation | null {
    return this.conversations.get(conversationId) || null;
  }

  deleteConversation(conversationId: string): boolean {
    return this.conversations.delete(conversationId);
  }

  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  clearAllConversations(): void {
    this.conversations.clear();
  }
}

export default new ChatbotService();

