import mongoose from "mongoose";
import Question from "../models/Question";
import { Difficulty, Category } from "../types";

describe("Simple Database Tests", () => {
  beforeAll(async () => {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/peerprep-questions";
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await Question.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Question.deleteMany({});
  });

  test("should connect to database", () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  test("should create and save a question", async () => {
    const questionData = {
      title: "Test Two Sum",
      description: "Find two numbers that add up to target",
      categories: [Category.ARRAYS, Category.ALGORITHMS],
      difficulty: Difficulty.EASY,
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

  test("should find questions by difficulty", async () => {
    const questions = [
      {
        title: "Easy Question",
        description: "An easy problem",
        categories: [Category.ARRAYS],
        difficulty: Difficulty.EASY,
      },
      {
        title: "Hard Question",
        description: "A hard problem",
        categories: [Category.ALGORITHMS],
        difficulty: Difficulty.HARD,
      },
    ];

    await Question.insertMany(questions);

    const easyQuestions = await Question.find({ difficulty: Difficulty.EASY });
    expect(easyQuestions).toHaveLength(1);
    expect(easyQuestions[0].title).toBe("Easy Question");
  });

  test("should find questions by category", async () => {
    const questions = [
      {
        title: "Array Question",
        description: "An array problem",
        categories: [Category.ARRAYS],
        difficulty: Difficulty.EASY,
      },
      {
        title: "Algorithm Question",
        description: "An algorithm problem",
        categories: [Category.ALGORITHMS],
        difficulty: Difficulty.MEDIUM,
      },
    ];

    await Question.insertMany(questions);

    const arrayQuestions = await Question.find({ categories: Category.ARRAYS });
    expect(arrayQuestions).toHaveLength(1);
    expect(arrayQuestions[0].title).toBe("Array Question");
  });

  test("should validate required fields", async () => {
    const invalidQuestion = new Question({
      title: "Invalid Question",
      // Missing required fields
    });

    await expect(invalidQuestion.save()).rejects.toThrow();
  });

  test("should handle unique title constraint", async () => {
    const questionData = {
      title: "Unique Title Test",
      description: "Test description",
      categories: [Category.ARRAYS],
      difficulty: Difficulty.EASY,
    };

    // Create first question
    const firstQuestion = await Question.create(questionData);
    expect(firstQuestion._id).toBeDefined();

    // Try to create duplicate (should fail due to unique constraint)
    try {
      await Question.create(questionData);
      // If we get here, the unique constraint is not working
      expect(true).toBe(false);
    } catch (error: any) {
      // This is expected - unique constraint should prevent duplicates
      expect(error.code).toBe(11000);
    }
  });

  test("should handle bulk operations efficiently", async () => {
    const startTime = Date.now();

    const bulkQuestions = Array.from({ length: 50 }, (_, i) => ({
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
    expect(count).toBe(50);
  });
});
