import request from "supertest";
import app from "../index";
import Question from "../models/Question";
import { Difficulty, Category } from "../types";

describe("API Tests", () => {
  beforeAll(async () => {
    // Wait for app to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  beforeEach(async () => {
    // Clear questions before each test
    await Question.deleteMany({});
  });

  afterAll(async () => {
    // Clean up
    await Question.deleteMany({});
  });

  describe("Health Endpoints", () => {
    test("GET /health should return service status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Question service is running");
      expect(response.body.uptime).toBeDefined();
      expect(response.body.memory).toBeDefined();
    });

    test("GET /metrics should return performance metrics", async () => {
      const response = await request(app).get("/metrics").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.uptime).toBeDefined();
      expect(response.body.data.memory).toBeDefined();
      expect(response.body.data.cpu).toBeDefined();
    });
  });

  describe("Question CRUD Operations", () => {
    test("POST /api/questions should create a question", async () => {
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

      const response = await request(app)
        .post("/api/questions")
        .send(questionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(questionData.title);
      expect(response.body.data.categories).toEqual(questionData.categories);
      expect(response.body.data.difficulty).toBe(questionData.difficulty);
    });

    test("GET /api/questions should return all questions", async () => {
      // Create test questions
      const questions = [
        {
          title: "Question 1",
          description: "Description 1",
          categories: [Category.ARRAYS],
          difficulty: Difficulty.EASY,
        },
        {
          title: "Question 2",
          description: "Description 2",
          categories: [Category.ALGORITHMS],
          difficulty: Difficulty.MEDIUM,
        },
      ];

      await Question.insertMany(questions);

      const response = await request(app).get("/api/questions").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    test("GET /api/questions/:id should return specific question", async () => {
      const question = await Question.create({
        title: "Test Question",
        description: "Test Description",
        categories: [Category.ARRAYS],
        difficulty: Difficulty.EASY,
      });

      const response = await request(app)
        .get(`/api/questions/${question._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe("Test Question");
    });

    test("PUT /api/questions/:id should update question", async () => {
      const question = await Question.create({
        title: "Original Title",
        description: "Original Description",
        categories: [Category.ARRAYS],
        difficulty: Difficulty.EASY,
      });

      const updateData = {
        title: "Updated Title",
        description: "Updated Description",
      };

      const response = await request(app)
        .put(`/api/questions/${question._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe("Updated Title");
    });

    test("DELETE /api/questions/:id should delete question", async () => {
      const question = await Question.create({
        title: "To Delete",
        description: "Will be deleted",
        categories: [Category.ARRAYS],
        difficulty: Difficulty.EASY,
      });

      const response = await request(app)
        .delete(`/api/questions/${question._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Question deleted successfully");

      // Verify deletion
      const deletedQuestion = await Question.findById(question._id);
      expect(deletedQuestion).toBeNull();
    });
  });

  describe("Question Filtering and Search", () => {
    beforeEach(async () => {
      const questions = [
        {
          title: "Easy Array Problem",
          description: "An easy problem about arrays",
          categories: [Category.ARRAYS],
          difficulty: Difficulty.EASY,
        },
        {
          title: "Hard Algorithm Problem",
          description: "A hard problem about algorithms",
          categories: [Category.ALGORITHMS],
          difficulty: Difficulty.HARD,
        },
        {
          title: "Medium Data Structure Problem",
          description: "A medium problem about data structures",
          categories: [Category.DATA_STRUCTURES],
          difficulty: Difficulty.MEDIUM,
        },
      ];

      await Question.insertMany(questions);
    });

    test("GET /api/questions?difficulty=Easy should filter by difficulty", async () => {
      const response = await request(app)
        .get("/api/questions?difficulty=Easy")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].difficulty).toBe("Easy");
    });

    test("GET /api/questions?category=Arrays should filter by category", async () => {
      const response = await request(app)
        .get("/api/questions?category=Arrays")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].categories).toContain("Arrays");
    });

    test("GET /api/questions?search=algorithm should search text", async () => {
      const response = await request(app)
        .get("/api/questions?search=algorithm")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toContain("Algorithm");
    });

    test("GET /api/questions?page=1&limit=2 should paginate results", async () => {
      const response = await request(app)
        .get("/api/questions?page=1&limit=2")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(3);
    });
  });

  describe("AI Generation Endpoints", () => {
    test("POST /api/questions/generate should generate questions", async () => {
      const response = await request(app)
        .post("/api/questions/generate")
        .send({
          difficulty: "Easy",
          categories: ["Arrays"],
          count: 2,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].difficulty).toBe("Easy");
      expect(response.body.data[0].categories).toContain("Arrays");
      expect(response.body.metadata).toBeDefined();
    });

    test("POST /api/questions/generate-and-save should generate and save questions", async () => {
      const response = await request(app)
        .post("/api/questions/generate-and-save")
        .send({
          difficulty: "Medium",
          categories: ["Algorithms"],
          count: 1,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]._id).toBeDefined();

      // Verify question was saved to database
      const savedQuestion = await Question.findById(response.body.data[0]._id);
      expect(savedQuestion).toBeDefined();
    });

    test("GET /api/questions/ai/stats should return AI service statistics", async () => {
      const response = await request(app)
        .get("/api/questions/ai/stats")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cache).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
    });

    test("DELETE /api/questions/ai/cache should clear AI cache", async () => {
      const response = await request(app)
        .delete("/api/questions/ai/cache")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "AI service cache cleared successfully"
      );
    });
  });

  describe("Error Handling", () => {
    test("GET /api/questions/invalid-id should return 400 for invalid ID", async () => {
      const response = await request(app)
        .get("/api/questions/invalid-id")
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid question ID format");
    });

    test("POST /api/questions should return 400 for invalid data", async () => {
      const response = await request(app)
        .post("/api/questions")
        .send({
          title: "Invalid Question",
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Validation failed");
    });

    test("GET /api/questions/nonexistent should return 404", async () => {
      const fakeId = "507f1f77bcf86cd799439011"; // Valid ObjectId format but doesn't exist

      const response = await request(app)
        .get(`/api/questions/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Question not found");
    });
  });

  describe("Performance Tests", () => {
    test("GET /api/questions should respond quickly", async () => {
      const startTime = Date.now();

      await request(app).get("/api/questions").expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    test("GET /api/questions/statistics should respond quickly", async () => {
      const startTime = Date.now();

      await request(app).get("/api/questions/statistics").expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should respond within 500ms
    });
  });
});
