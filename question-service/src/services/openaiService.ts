import { IQuestion, Difficulty, Category } from "../types";

interface AIGenerationRequest {
  difficulty: Difficulty;
  categories: Category[];
  topic?: string;
  count?: number;
}

interface AIGenerationResponse {
  questions: IQuestion[];
  metadata: {
    generatedAt: string;
    processingTime: number;
    model: string;
  };
}

// Real OpenAI integration service
class OpenAIService {
  private readonly apiKey: string;
  private readonly model = "gpt-4-turbo-preview";
  private readonly maxQuestionsPerRequest = 5;
  private readonly cache = new Map<
    string,
    { data: AIGenerationResponse; timestamp: number }
  >();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "OPENAI_API_KEY not found. AI generation will use mock data."
      );
    }
  }

  async generateQuestions(
    request: AIGenerationRequest
  ): Promise<AIGenerationResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Validate request
      this.validateRequest(request);

      let questions: IQuestion[];

      if (this.apiKey) {
        // Use real OpenAI API
        questions = await this.callOpenAIAPI(request);
      } else {
        // Fallback to mock data
        questions = await this.generateMockQuestions(request);
      }

      const response: AIGenerationResponse = {
        questions,
        metadata: {
          generatedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          model: this.model,
        },
      };

      // Cache the response
      this.cache.set(cacheKey, { data: response, timestamp: Date.now() });

      return response;
    } catch (error) {
      console.error("AI generation failed:", error);
      throw new Error("Failed to generate questions");
    }
  }

  private validateRequest(request: AIGenerationRequest): void {
    if (
      !request.difficulty ||
      !Object.values(Difficulty).includes(request.difficulty)
    ) {
      throw new Error("Invalid difficulty level");
    }

    if (!request.categories || request.categories.length === 0) {
      throw new Error("At least one category is required");
    }

    if (
      request.count &&
      (request.count < 1 || request.count > this.maxQuestionsPerRequest)
    ) {
      throw new Error(
        `Count must be between 1 and ${this.maxQuestionsPerRequest}`
      );
    }
  }

  private generateCacheKey(request: AIGenerationRequest): string {
    return `openai:${request.difficulty}:${request.categories
      .sort()
      .join(",")}:${request.topic || "general"}:${request.count || 1}`;
  }

  private async callOpenAIAPI(
    request: AIGenerationRequest
  ): Promise<IQuestion[]> {
    const prompt = this.buildPrompt(request);

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: "system",
                content:
                  "You are an expert coding interview question generator. Generate high-quality programming questions in JSON format.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 4000,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as any;
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No content received from OpenAI API");
      }

      // Parse the JSON response
      const questions = JSON.parse(content);

      // Validate and transform the questions
      return this.validateAndTransformQuestions(questions, request);
    } catch (error) {
      console.error("OpenAI API call failed:", error);
      // Fallback to mock data
      return this.generateMockQuestions(request);
    }
  }

  private buildPrompt(request: AIGenerationRequest): string {
    const { difficulty, categories, topic, count = 1 } = request;

    return `Generate ${count} coding interview question${
      count > 1 ? "s" : ""
    } with the following specifications:

Difficulty: ${difficulty}
Categories: ${categories.join(", ")}
${topic ? `Topic: ${topic}` : ""}

Each question should include:
- title: A clear, concise title
- description: Detailed problem description
- categories: Array of categories (must include the specified ones)
- difficulty: The specified difficulty level
- link: A relevant LeetCode-style URL
- examples: Array of input/output examples with explanations
- constraints: Array of problem constraints
- testCases: Array of test cases with input and expected output
- hints: Array of helpful hints

Return the response as a JSON array of question objects. Make sure the JSON is valid and properly formatted.

Example format:
[
  {
    "title": "Two Sum",
    "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    "categories": ["Arrays", "Algorithms"],
    "difficulty": "Easy",
    "link": "https://leetcode.com/problems/two-sum/",
    "examples": [
      {
        "input": "nums = [2,7,11,15], target = 9",
        "output": "[0,1]",
        "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
      }
    ],
    "constraints": [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9"
    ],
    "testCases": [
      {
        "input": "[2,7,11,15]",
        "expectedOutput": "[0,1]"
      }
    ],
    "hints": [
      "Use a hash map to store numbers and their indices",
      "For each number, check if target - number exists in the hash map"
    ]
  }
]`;
  }

  private validateAndTransformQuestions(
    questions: any[],
    request: AIGenerationRequest
  ): IQuestion[] {
    if (!Array.isArray(questions)) {
      throw new Error("Invalid response format: expected array of questions");
    }

    return questions.map((q, index) => ({
      title: q.title || `Generated Question ${index + 1}`,
      description: q.description || "No description provided",
      categories: Array.isArray(q.categories)
        ? q.categories
        : request.categories,
      difficulty: q.difficulty || request.difficulty,
      link: q.link || `https://leetcode.com/problems/generated-${index + 1}/`,
      examples: Array.isArray(q.examples) ? q.examples : [],
      constraints: Array.isArray(q.constraints) ? q.constraints : [],
      testCases: Array.isArray(q.testCases) ? q.testCases : [],
      hints: Array.isArray(q.hints) ? q.hints : [],
    }));
  }

  private async generateMockQuestions(
    request: AIGenerationRequest
  ): Promise<IQuestion[]> {
    // Fallback mock implementation (same as before)
    const count = request.count || 1;
    const questions: IQuestion[] = [];

    for (let i = 0; i < count; i++) {
      questions.push(this.generateMockQuestion(request, i));
    }

    // Simulate API call delay
    await new Promise((resolve) =>
      setTimeout(resolve, 1000 + Math.random() * 2000)
    );

    return questions;
  }

  private generateMockQuestion(
    request: AIGenerationRequest,
    index: number
  ): IQuestion {
    const topics = this.getTopicsForCategories(request.categories);
    const topic =
      request.topic || topics[Math.floor(Math.random() * topics.length)];

    return {
      title: `${topic} Problem ${index + 1}`,
      description: this.generateDescription(topic, request.difficulty),
      categories: request.categories,
      difficulty: request.difficulty,
      link: `https://leetcode.com/problems/${topic
        .toLowerCase()
        .replace(/\s+/g, "-")}-${index + 1}/`,
      examples: this.generateExamples(topic, request.difficulty),
      constraints: this.generateConstraints(topic, request.difficulty),
      testCases: this.generateTestCases(topic, request.difficulty),
      hints: this.generateHints(topic, request.difficulty),
    };
  }

  private getTopicsForCategories(categories: Category[]): string[] {
    const topicMap: Partial<Record<Category, string[]>> = {
      [Category.ARRAYS]: [
        "Two Sum",
        "Maximum Subarray",
        "Container With Most Water",
        "Product of Array Except Self",
      ],
      [Category.ALGORITHMS]: [
        "Binary Search",
        "Merge Sort",
        "Quick Sort",
        "Bubble Sort",
      ],
      [Category.DATA_STRUCTURES]: [
        "Linked List",
        "Binary Tree",
        "Stack",
        "Queue",
      ],
      [Category.DYNAMIC_PROGRAMMING]: [
        "Fibonacci",
        "Longest Common Subsequence",
        "Knapsack",
        "Coin Change",
      ],
      [Category.MATH]: ["Prime Numbers", "Factorial", "GCD", "LCM"],
      [Category.STRINGS]: [
        "Palindrome",
        "Anagram",
        "String Matching",
        "Regular Expression",
      ],
      [Category.SEARCHING]: [
        "Linear Search",
        "Binary Search",
        "Depth First Search",
        "Breadth First Search",
      ],
      [Category.SORTING]: [
        "Bubble Sort",
        "Quick Sort",
        "Merge Sort",
        "Heap Sort",
      ],
      [Category.GREEDY]: [
        "Activity Selection",
        "Fractional Knapsack",
        "Huffman Coding",
        "Minimum Spanning Tree",
      ],
    };

    return categories.flatMap((cat) => topicMap[cat] || []);
  }

  private generateDescription(topic: string, difficulty: Difficulty): string {
    const descriptions = {
      [Difficulty.EASY]: `Given a simple ${topic.toLowerCase()} problem, implement an efficient solution.`,
      [Difficulty.MEDIUM]: `Solve this ${topic.toLowerCase()} problem with optimal time and space complexity.`,
      [Difficulty.HARD]: `Implement an advanced algorithm for this complex ${topic.toLowerCase()} problem.`,
    };

    return descriptions[difficulty];
  }

  private generateExamples(topic: string, difficulty: Difficulty): any[] {
    const exampleCount = difficulty === Difficulty.HARD ? 3 : 2;
    const examples = [];

    for (let i = 0; i < exampleCount; i++) {
      examples.push({
        input: `Input ${i + 1}: [1, 2, 3, 4, 5]`,
        output: `Output ${i + 1}: [5, 4, 3, 2, 1]`,
        explanation: `This example demonstrates the ${topic.toLowerCase()} concept.`,
      });
    }

    return examples;
  }

  private generateConstraints(topic: string, difficulty: Difficulty): string[] {
    const baseConstraints = ["1 <= n <= 10^5", "All values are unique"];

    if (difficulty === Difficulty.HARD) {
      baseConstraints.push("Time complexity must be O(n log n) or better");
      baseConstraints.push("Space complexity must be O(1)");
    }

    return baseConstraints;
  }

  private generateTestCases(topic: string, difficulty: Difficulty): any[] {
    const testCaseCount = difficulty === Difficulty.HARD ? 5 : 3;
    const testCases = [];

    for (let i = 0; i < testCaseCount; i++) {
      testCases.push({
        input: `[${Array.from({ length: 5 }, (_, j) => j + i).join(", ")}]`,
        expectedOutput: `[${Array.from({ length: 5 }, (_, j) => 5 - j + i).join(
          ", "
        )}]`,
      });
    }

    return testCases;
  }

  private generateHints(topic: string, difficulty: Difficulty): string[] {
    const hints = [
      `Consider using ${topic.toLowerCase()} data structures`,
      "Think about the time and space complexity",
    ];

    if (difficulty === Difficulty.HARD) {
      hints.push("This problem requires advanced algorithmic thinking");
      hints.push("Consider edge cases and optimization techniques");
    }

    return hints;
  }

  // Clear cache (useful for testing or memory management)
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export default new OpenAIService();
