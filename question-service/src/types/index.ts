export enum Difficulty {
  EASY = "Easy",
  MEDIUM = "Medium",
  HARD = "Hard",
}

export enum Category {
  ALGORITHMS = "Algorithms",
  DATA_STRUCTURES = "Data Structures",
  DATABASES = "Databases",
  STRINGS = "Strings",
  ARRAYS = "Arrays",
  DYNAMIC_PROGRAMMING = "Dynamic Programming",
  GRAPHS = "Graphs",
  TREES = "Trees",
  SORTING = "Sorting",
  SEARCHING = "Searching",
  RECURSION = "Recursion",
  BACKTRACKING = "Backtracking",
  GREEDY = "Greedy",
  BIT_MANIPULATION = "Bit Manipulation",
  MATH = "Math",
  SYSTEM_DESIGN = "System Design",
}

export interface IQuestion {
  id?: string;
  title: string;
  description: string;
  categories: Category[];
  difficulty: Difficulty;
  link?: string;
  examples?: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints?: string[];
  testCases?: {
    input: string;
    expectedOutput: string;
  }[];
  hints?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QuestionFilter {
  difficulty?: Difficulty;
  category?: Category;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}
