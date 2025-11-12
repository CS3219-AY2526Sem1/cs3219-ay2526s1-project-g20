import { Router } from "express";
import questionController from "../controllers/QuestionController";
import {
  validateQuestion,
  handleValidationErrors,
  validateAIGeneration,
} from "../middleware/validators";

const router = Router();

// Statistics route (must come before /:id to avoid conflicts)
router.get(
  "/statistics",
  questionController.getStatistics.bind(questionController)
);

// Random question route
router.get(
  "/random",
  questionController.getRandomQuestion.bind(questionController)
);

// AI Generation routes
router.post(
  "/generate",
  validateAIGeneration,
  handleValidationErrors,
  questionController.generateQuestions.bind(questionController)
);

router.post(
  "/generate-and-save",
  validateAIGeneration,
  handleValidationErrors,
  questionController.generateAndSaveQuestions.bind(questionController)
);

router.get(
  "/ai/stats",
  questionController.getAIServiceStats.bind(questionController)
);

router.delete(
  "/ai/cache",
  questionController.clearAICache.bind(questionController)
);

// CRUD routes
router.post(
  "/",
  validateQuestion,
  handleValidationErrors,
  questionController.createQuestion.bind(questionController)
);

router.get("/", questionController.getAllQuestions.bind(questionController));

router.get("/:id", questionController.getQuestionById.bind(questionController));

router.put(
  "/:id",
  validateQuestion,
  handleValidationErrors,
  questionController.updateQuestion.bind(questionController)
);

router.delete(
  "/:id",
  questionController.deleteQuestion.bind(questionController)
);

// Code execution route
router.post(
  "/execute",
  questionController.executeCode.bind(questionController)
);

export default router;

