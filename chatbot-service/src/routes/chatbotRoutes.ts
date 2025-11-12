import { Router } from "express";
import chatbotController from "../controllers/chatbotController";
import {
  validateChatMessage,
  handleValidationErrors,
} from "../middleware/validators";

const router = Router();

// Chat endpoint - send message to chatbot
router.post(
  "/chat",
  validateChatMessage,
  handleValidationErrors,
  chatbotController.sendMessage.bind(chatbotController)
);

// Get conversation history
router.get(
  "/conversation/:conversationId",
  chatbotController.getConversation.bind(chatbotController)
);

// Delete a conversation
router.delete(
  "/conversation/:conversationId",
  chatbotController.deleteConversation.bind(chatbotController)
);

// Get all conversations
router.get(
  "/conversations",
  chatbotController.getAllConversations.bind(chatbotController)
);

// Clear all conversations
router.delete(
  "/conversations",
  chatbotController.clearAllConversations.bind(chatbotController)
);

export default router;


