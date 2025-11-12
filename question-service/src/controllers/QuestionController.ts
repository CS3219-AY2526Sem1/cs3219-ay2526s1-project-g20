import { Request, Response } from "express";
import Question from "../models/Question";
import {
  QuestionFilter,
  PaginationParams,
  Difficulty,
  Category,
} from "../types";
import { getPerformanceMetrics } from "../middleware/performance";
import aiService from "../services/aiService";
import codeExecutionService from "../services/codeExecutionService";

// Simple in-memory cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache helper functions
const getFromCache = (key: string): any => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key: string, data: any): void => {
  cache.set(key, { data, timestamp: Date.now() });
};

const clearCache = (): void => {
  cache.clear();
};

export class QuestionController {
  // Create a new question
  async createQuestion(req: Request, res: Response): Promise<void> {
    try {
      const question = new Question(req.body);
      const savedQuestion = await question.save();
      res.status(201).json({
        success: true,
        data: savedQuestion,
        message: "Question created successfully",
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(400).json({
          success: false,
          message: "A question with this title already exists",
        });
      } else if (error.name === "ValidationError") {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to create question",
        });
      }
    }
  }

  // Get all questions with optional filters and pagination
  async getAllQuestions(req: Request, res: Response): Promise<void> {
    try {
      const {
        difficulty,
        category,
        search,
        page = 1,
        limit = 10,
        sort = "createdAt",
      } = req.query;

      // Validate pagination parameters
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit))); // Max 100 items per page

      // Create cache key
      const cacheKey = `questions:${JSON.stringify({
        difficulty,
        category,
        search,
        page: pageNum,
        limit: limitNum,
        sort,
      })}`;

      // Try to get from cache first
      const cachedResult = getFromCache(cacheKey);
      if (cachedResult) {
        res.status(200).json(cachedResult);
        return;
      }

      const filter: any = {};

      if (difficulty) {
        filter.difficulty = difficulty;
      }

      if (category) {
        filter.categories = category;
      }

      if (search) {
        filter.$text = { $search: search as string };
      }

      const skip = (pageNum - 1) * limitNum;

      // Build sort object
      const sortObj: any = {};
      if (sort === "title") sortObj.title = 1;
      else if (sort === "difficulty") sortObj.difficulty = 1;
      else sortObj.createdAt = -1;

      const [questions, total] = await Promise.all([
        Question.find(filter)
          .select("-__v") // Exclude version field
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(), // Use lean() for better performance
        Question.countDocuments(filter),
      ]);

      const result = {
        success: true,
        data: questions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };

      // Cache the result
      setCache(cacheKey, result);

      res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch questions",
      });
    }
  }

  // Get a single question by ID
  async getQuestionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ObjectId format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400).json({
          success: false,
          message: "Invalid question ID format",
        });
        return;
      }

      // Try cache first
      const cacheKey = `question:${id}`;
      const cachedQuestion = getFromCache(cacheKey);
      if (cachedQuestion) {
        res.status(200).json({
          success: true,
          data: cachedQuestion,
        });
        return;
      }

      const question = await Question.findById(id).select("-__v").lean();

      if (!question) {
        res.status(404).json({
          success: false,
          message: "Question not found",
        });
        return;
      }

      // Cache the question
      setCache(cacheKey, question);

      res.status(200).json({
        success: true,
        data: question,
      });
    } catch (error) {
      console.error("Error fetching question:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch question",
      });
    }
  }

  // Get a random question based on difficulty and category
  async getRandomQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { difficulty, category } = req.query;

      const filter: any = {};

      if (difficulty) {
        filter.difficulty = difficulty;
      }

      if (category) {
        filter.categories = category;
      }

      // Use aggregation for better performance with random selection
      const questions = await Question.aggregate([
        { $match: filter },
        { $sample: { size: 1 } },
        { $project: { __v: 0 } },
      ]);

      if (questions.length === 0) {
        res.status(404).json({
          success: false,
          message: "No questions found matching the criteria",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: questions[0],
      });
    } catch (error) {
      console.error("Error fetching random question:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch random question",
      });
    }
  }

  // Update a question
  async updateQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ObjectId format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400).json({
          success: false,
          message: "Invalid question ID format",
        });
        return;
      }

      const question = await Question.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      }).select("-__v");

      if (!question) {
        res.status(404).json({
          success: false,
          message: "Question not found",
        });
        return;
      }

      // Clear related cache entries
      clearCache();

      res.status(200).json({
        success: true,
        data: question,
        message: "Question updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating question:", error);
      if (error.name === "ValidationError") {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else if (error.code === 11000) {
        res.status(400).json({
          success: false,
          message: "A question with this title already exists",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to update question",
        });
      }
    }
  }

  // Delete a question
  async deleteQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ObjectId format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400).json({
          success: false,
          message: "Invalid question ID format",
        });
        return;
      }

      const question = await Question.findByIdAndDelete(id);

      if (!question) {
        res.status(404).json({
          success: false,
          message: "Question not found",
        });
        return;
      }

      // Clear cache
      clearCache();

      res.status(200).json({
        success: true,
        message: "Question deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete question",
      });
    }
  }

  // Get question statistics
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const cacheKey = "statistics";
      const cachedStats = getFromCache(cacheKey);

      if (cachedStats) {
        res.status(200).json({
          success: true,
          data: cachedStats,
        });
        return;
      }

      const [total, byDifficultyRaw, byCategory] = await Promise.all([
        Question.countDocuments(),
        Question.aggregate([
          { $group: { _id: "$difficulty", count: { $sum: 1 } } },
        ]),
        Question.aggregate([
          { $unwind: "$categories" },
          { $group: { _id: "$categories", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

      const difficultyOrder = ["Easy", "Medium", "Hard"];
      const byDifficulty = byDifficultyRaw.sort((a, b) => {
        const ai = difficultyOrder.indexOf(String(a._id));
        const bi = difficultyOrder.indexOf(String(b._id));
        if (ai === -1 && bi === -1) return String(a._id).localeCompare(String(b._id));
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

      const stats = {
        total,
        byDifficulty,
        byCategory,
        performance: getPerformanceMetrics(),
      };

      // Cache statistics for 10 minutes
      setCache(cacheKey, stats);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch statistics",
      });
    }
  }

  // Generate questions using AI
  async generateQuestions(req: Request, res: Response): Promise<void> {
    try {
      const { difficulty, categories, topic, count = 1 } = req.body;

      // Validate input
      if (!difficulty || !Object.values(Difficulty).includes(difficulty)) {
        res.status(400).json({
          success: false,
          message: "Valid difficulty level is required",
        });
        return;
      }

      if (
        !categories ||
        !Array.isArray(categories) ||
        categories.length === 0
      ) {
        res.status(400).json({
          success: false,
          message: "At least one category is required",
        });
        return;
      }

      if (count < 1 || count > 5) {
        res.status(400).json({
          success: false,
          message: "Count must be between 1 and 5",
        });
        return;
      }

      // Generate questions using AI
      const aiResponse = await aiService.generateQuestions({
        difficulty,
        categories,
        topic,
        count,
      });

      res.status(200).json({
        success: true,
        data: aiResponse.questions,
        metadata: aiResponse.metadata,
        message: `Generated ${aiResponse.questions.length} questions successfully`,
      });
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate questions",
      });
    }
  }

  // Generate and save questions using AI
  async generateAndSaveQuestions(req: Request, res: Response): Promise<void> {
    try {
      const { difficulty, categories, topic, count = 1 } = req.body;

      // Validate input
      if (!difficulty || !Object.values(Difficulty).includes(difficulty)) {
        res.status(400).json({
          success: false,
          message: "Valid difficulty level is required",
        });
        return;
      }

      if (
        !categories ||
        !Array.isArray(categories) ||
        categories.length === 0
      ) {
        res.status(400).json({
          success: false,
          message: "At least one category is required",
        });
        return;
      }

      if (count < 1 || count > 5) {
        res.status(400).json({
          success: false,
          message: "Count must be between 1 and 5",
        });
        return;
      }

      // Generate questions using AI
      const aiResponse = await aiService.generateQuestions({
        difficulty,
        categories,
        topic,
        count,
      });

      // Save questions to database
      const savedQuestions = await Question.insertMany(aiResponse.questions);

      // Clear cache since we added new questions
      clearCache();

      res.status(201).json({
        success: true,
        data: savedQuestions,
        metadata: aiResponse.metadata,
        message: `Generated and saved ${savedQuestions.length} questions successfully`,
      });
    } catch (error: any) {
      console.error("Error generating and saving questions:", error);

      if (error.code === 11000) {
        res.status(400).json({
          success: false,
          message: "Some generated questions already exist (duplicate titles)",
        });
      } else if (error.name === "ValidationError") {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to generate and save questions",
        });
      }
    }
  }

  // Get AI service statistics
  async getAIServiceStats(req: Request, res: Response): Promise<void> {
    try {
      const cacheStats = aiService.getCacheStats();

      res.status(200).json({
        success: true,
        data: {
          cache: cacheStats,
          performance: getPerformanceMetrics(),
        },
      });
    } catch (error) {
      console.error("Error fetching AI service stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch AI service statistics",
      });
    }
  }

  // Clear AI service cache
  async clearAICache(req: Request, res: Response): Promise<void> {
    try {
      aiService.clearCache();

      res.status(200).json({
        success: true,
        message: "AI service cache cleared successfully",
      });
    } catch (error) {
      console.error("Error clearing AI cache:", error);
      res.status(500).json({
        success: false,
        message: "Failed to clear AI service cache",
      });
    }
  }

  // Execute code with test cases
  async executeCode(req: Request, res: Response): Promise<void> {
    try {
      const { code, language, testCases } = req.body;

      if (!code || !language) {
        res.status(400).json({
          success: false,
          message: "Code and language are required",
        });
        return;
      }

      if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
        res.status(400).json({
          success: false,
          message: "Test cases array is required",
        });
        return;
      }

      const result = await codeExecutionService.executeCode(
        code,
        language,
        testCases
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("Error executing code:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to execute code",
      });
    }
  }
}

export default new QuestionController();
