import { Request, Response } from "express";
import chatbotService from "../services/chatbotService";
import { ChatbotRequest, ChatbotMode } from "../types";

export class ChatbotController {
  // Send a message to the chatbot
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message, conversationId, mode, context } = req.body;

      const request: ChatbotRequest = {
        message,
        conversationId,
        mode: mode as ChatbotMode,
        context,
      };

      const response = await chatbotService.sendMessage(request);

      res.status(200).json(response);
    } catch (error: any) {
      console.error("Error sending message:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to send message",
      });
    }
  }

  // Get conversation history
  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;

      const conversation = chatbotService.getConversation(conversationId);

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error: any) {
      console.error("Error getting conversation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get conversation",
      });
    }
  }

  // Delete a conversation
  async deleteConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;

      const deleted = chatbotService.deleteConversation(conversationId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Conversation deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete conversation",
      });
    }
  }

  // Get all conversations
  async getAllConversations(req: Request, res: Response): Promise<void> {
    try {
      const conversations = chatbotService.getAllConversations();

      res.status(200).json({
        success: true,
        data: conversations,
        count: conversations.length,
      });
    } catch (error: any) {
      console.error("Error getting conversations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get conversations",
      });
    }
  }

  // Clear all conversations
  async clearAllConversations(req: Request, res: Response): Promise<void> {
    try {
      chatbotService.clearAllConversations();

      res.status(200).json({
        success: true,
        message: "All conversations cleared successfully",
      });
    } catch (error: any) {
      console.error("Error clearing conversations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to clear conversations",
      });
    }
  }
}

export default new ChatbotController();


