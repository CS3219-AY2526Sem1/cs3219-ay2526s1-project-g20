import { IQuestion, Difficulty, Category } from "../types";
import openaiService from "./openaiService";

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

// AI service that delegates to the appropriate AI provider
class AIService {
  private readonly model = "gpt-4-turbo";
  private readonly maxQuestionsPerRequest = 5;
  private readonly cache = new Map<
    string,
    { data: AIGenerationResponse; timestamp: number }
  >();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  async generateQuestions(
    request: AIGenerationRequest
  ): Promise<AIGenerationResponse> {
    // Delegate to the OpenAI service
    return openaiService.generateQuestions(request);
  }

  // Clear cache (delegate to OpenAI service)
  clearCache(): void {
    openaiService.clearCache();
  }

  // Get cache statistics (delegate to OpenAI service)
  getCacheStats(): { size: number; keys: string[] } {
    return openaiService.getCacheStats();
  }
}

export default new AIService();
