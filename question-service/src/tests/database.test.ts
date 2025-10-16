import mongoose from "mongoose";
import Question from "../models/Question";
import { connectDatabase, checkDatabaseHealth } from "../config/database";
import { Difficulty, Category } from "../types";

describe("Database Tests", () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri =
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/peerprep-questions-test";
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up
    await Question.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clear questions before each test
    await Question.deleteMany({});
  });

  describe("Database Connection", () => {
    test("should connect to MongoDB successfully", async () => {
      expect(mongoose.connection.readyState).toBe(1);
    });

    test("should pass health check", async () => {
      const isHealthy = await checkDatabaseHealth();
      expect(isHealthy).toBe(true);
    });
  });

  describe("Question Model", () => {
    test("should create a question successfully", async () => {
      const questionData = {
        title: "Test Two Sum",
        description: "Find two numbers that add up to target",
        categories: [Category.ARRAYS, Category.ALGORITHMS],
        difficulty: Difficulty.EASY,
        link: "https://leetcode.com/problems/two-sum/",
        examples: [
          {
            input: "nums = [2,7,11,15], target = 9",
            output: "[0,1]",
            explanation: "Because nums[0] + nums[1] == 9",
          },
        ],
        constraints: ["2 <= nums.length <= 10^4"],
        testCases: [
          {
            input: "[2,7,11,15]",
            expectedOutput: "[0,1]",
          },
        ],
        hints: ["Use a hash map"],
      };

      const question = new Question(questionData);
      const savedQuestion = await question.save();

      expect(savedQuestion._id).toBeDefined();
      expect(savedQuestion.title).toBe(questionData.title);
      expect(savedQuestion.categories).toEqual(questionData.categories);
      expect(savedQuestion.difficulty).toBe(questionData.difficulty);
    });

    test("should validate required fields", async () => {
      const invalidQuestion = new Question({
        title: "Invalid Question",
        // Missing required fields
      });

      await expect(invalidQuestion.save()).rejects.toThrow();
    });

    test("should enforce unique title constraint", async () => {
      const questionData = {
        title: "Duplicate Title",
        description: "Test description",
        categories: [Category.ARRAYS],
        difficulty: Difficulty.EASY,
      };

      // Create first question
      await Question.create(questionData);

      // Try to create duplicate
      const duplicateQuestion = new Question(questionData);
      await expect(duplicateQuestion.save()).rejects.toThrow();
    });

    test("should validate difficulty enum", async () => {
      const questionData = {
        title: "Invalid Difficulty",
        description: "Test description",
        categories: [Category.ARRAYS],
        difficulty: "InvalidDifficulty",
      };

      const question = new Question(questionData);
      await expect(question.save()).rejects.toThrow();
    });

    test("should validate categories enum", async () => {
      const questionData = {
        title: "Invalid Categories",
        description: "Test description",
        categories: ["InvalidCategory"],
        difficulty: Difficulty.EASY,
      };

      const question = new Question(questionData);
      await expect(question.save()).rejects.toThrow();
    });
  });

  describe("Database Queries", () => {
    beforeEach(async () => {
      // Seed test data
      const questions = [
        {
          title: "Two Sum",
          description: "Find two numbers that add up to target",
          categories: [Category.ARRAYS, Category.ALGORITHMS],
          difficulty: Difficulty.EASY,
        },
        {
          title: "Binary Search",
          description: "Search in sorted array",
          categories: [Category.ALGORITHMS, Category.SEARCHING],
          difficulty: Difficulty.EASY,
        },
        {
          title: "Merge K Sorted Lists",
          description: "Merge multiple sorted lists",
          categories: [Category.DATA_STRUCTURES, Category.ALGORITHMS],
          difficulty: Difficulty.HARD,
        },
      ];

      await Question.insertMany(questions);
    });

    test("should find questions by difficulty", async () => {
      const easyQuestions = await Question.find({
        difficulty: Difficulty.EASY,
      });
      expect(easyQuestions).toHaveLength(2);
      expect(easyQuestions.every((q) => q.difficulty === Difficulty.EASY)).toBe(
        true
      );
    });

    test("should find questions by category", async () => {
      const arrayQuestions = await Question.find({
        categories: Category.ARRAYS,
      });
      expect(arrayQuestions).toHaveLength(1);
      expect(arrayQuestions[0].title).toBe("Two Sum");
    });

    test("should find questions by multiple categories", async () => {
      const algorithmQuestions = await Question.find({
        categories: Category.ALGORITHMS,
      });
      expect(algorithmQuestions).toHaveLength(3);
    });

    test("should perform text search", async () => {
      const searchResults = await Question.find({
        $text: { $search: "search" },
      });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe("Binary Search");
    });

    test("should paginate results", async () => {
      const page1 = await Question.find().limit(2).skip(0);
      const page2 = await Question.find().limit(2).skip(2);

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
    });

    test("should sort by creation date", async () => {
      const sortedQuestions = await Question.find().sort({ createdAt: -1 });
      expect(sortedQuestions[0].title).toBe("Merge K Sorted Lists");
    });
  });

  describe("Database Indexes", () => {
    test("should have text search index", async () => {
      const indexes = await Question.collection.getIndexes();
      const textIndex = Object.values(indexes).find(
        (index: any) =>
          index.text && index.text.title === 1 && index.text.description === 1
      );
      expect(textIndex).toBeDefined();
    });

    test("should have difficulty index", async () => {
      const indexes = await Question.collection.getIndexes();
      const difficultyIndex = Object.values(indexes).find(
        (index: any) => index.difficulty === 1
      );
      expect(difficultyIndex).toBeDefined();
    });

    test("should have categories index", async () => {
      const indexes = await Question.collection.getIndexes();
      const categoriesIndex = Object.values(indexes).find(
        (index: any) => index.categories === 1
      );
      expect(categoriesIndex).toBeDefined();
    });
  });

  describe("Database Performance", () => {
    test("should handle bulk insert efficiently", async () => {
      const startTime = Date.now();

      const bulkQuestions = Array.from({ length: 100 }, (_, i) => ({
        title: `Bulk Question ${i}`,
        description: `Description for question ${i}`,
        categories: [Category.ALGORITHMS],
        difficulty: Difficulty.EASY,
      }));

      await Question.insertMany(bulkQuestions);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      const count = await Question.countDocuments();
      expect(count).toBe(100);
    });

    test("should handle complex queries efficiently", async () => {
      // Seed more data
      const questions = Array.from({ length: 50 }, (_, i) => ({
        title: `Performance Test ${i}`,
        description: `Description for performance test ${i}`,
        categories: i % 2 === 0 ? [Category.ARRAYS] : [Category.ALGORITHMS],
        difficulty: i % 3 === 0 ? Difficulty.HARD : Difficulty.EASY,
      }));

      await Question.insertMany(questions);

      const startTime = Date.now();

      // Complex query with multiple filters and sorting
      const results = await Question.find({
        difficulty: { $in: [Difficulty.EASY, Difficulty.MEDIUM] },
        categories: Category.ARRAYS,
      })
        .sort({ createdAt: -1 })
        .limit(10);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(results).toBeDefined();
    });
  });
});
