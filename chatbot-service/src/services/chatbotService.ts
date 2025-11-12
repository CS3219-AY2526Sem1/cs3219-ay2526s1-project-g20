import axios, { AxiosInstance } from "axios";
import dotenv from "dotenv";

// Ensure environment variables from .env are loaded before we access them
dotenv.config();
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
        
        // Get context from the last user message
        const userMessages = messages.filter(m => m.role === 'user');
        const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
        const systemMessage = messages.find(m => m.role === 'system')?.content || '';
        
        // Generate a context-aware mock response
        let mockResponse = "";
        
        if (systemMessage.includes('coding') || systemMessage.includes('context')) {
          mockResponse = this.getMockCodingResponse(lastUserMessage);
        } else if (systemMessage.includes('hint')) {
          mockResponse = this.getMockHintResponse(lastUserMessage);
        } else if (systemMessage.includes('explain')) {
          mockResponse = this.getMockExplanationResponse(lastUserMessage);
        } else {
          mockResponse = this.getMockGeneralResponse(lastUserMessage);
        }
        
        return {
          response: mockResponse,
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

  private getMockCodingResponse(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('help') || lowerMessage.includes('stuck')) {
      return "I see you need help with your code! To help you better, could you:\n1. Describe what you're trying to achieve?\n2. What specific error or issue are you encountering?\n3. Share the relevant code snippet if possible?\n\nTip: Breaking down the problem into smaller steps often makes it easier to solve!";
    }
    
    if (lowerMessage.includes('time complexity') || lowerMessage.includes('space complexity')) {
      return "Great question! Here's a quick overview:\n\n**Time Complexity**: Measures how long an algorithm takes to run. Common notations:\n- O(1): Constant time\n- O(log n): Logarithmic\n- O(n): Linear\n- O(n²): Quadratic\n\n**Space Complexity**: Measures memory usage by an algorithm.\n\nFor your current problem, think about the operations you're performing - is there a way to optimize them?";
    }
    
    if (lowerMessage.includes('debug') || lowerMessage.includes('error')) {
      return "Let's debug step by step:\n\n1. **Check your input/output**: Are you handling edge cases?\n2. **Trace through your logic**: Walk through your code mentally with sample inputs\n3. **Add print statements**: Log intermediate values to see where things go wrong\n4. **Review your data structures**: Are you using the right ones for your use case?\n\nShare more details about the specific error and I can help further!";
    }
    
    if (lowerMessage.includes('approach') || lowerMessage.includes('how to')) {
      return "Here's a systematic approach to solve coding problems:\n\n1. **Understand the problem**: Read carefully, note constraints\n2. **Identify the data structures**: What fits your needs?\n3. **Plan your algorithm**: Pseudocode first!\n4. **Implement**: Code your solution\n5. **Test**: Try edge cases\n6. **Optimize**: Can you improve time/space complexity?\n\nWhat specific approach are you considering for this problem?";
    }
    
    return `I'm Preppy, your AI coding assistant! I can help you with algorithms, debugging, optimization, and code explanations. 
    
Right now, I'm running in mock mode. To enable full AI capabilities, please configure your OpenAI API key. 

In the meantime, I can still help you think through coding challenges and provide guidance based on common patterns and best practices!
    
How can I assist you with your coding problem today?`;
  }

  private getMockHintResponse(message: string): string {
    return `Here's a hint to guide you:\n\n💡 **Think about the problem constraints** - what are the limits?\n💡 **Consider edge cases** - empty inputs, single elements, etc.\n💡 **Break it down** - can you solve a simpler version first?\n💡 **Pattern recognition** - does this remind you of another problem?\n\nTry to make progress with these hints, and let me know if you need more guidance!`;
  }

  private getMockExplanationResponse(message: string): string {
    return `Let me explain that concept:\n\n**Core Concept**: \n\n**How it works**:\n\n**Example**:\n\n**Common use cases**:\n\nWould you like me to elaborate on any specific part?`;
  }

  private getMockGeneralResponse(message: string): string {
    return "I'm Preppy, your AI assistant for PeerPrep! I'm here to help you with coding problems, provide hints, explanations, and general guidance. How can I assist you today?";
  }
}

export default new ChatbotService();

