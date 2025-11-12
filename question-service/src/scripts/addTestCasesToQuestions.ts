import mongoose from "mongoose";
import Question from "../models/Question";
import { IQuestion } from "../types";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/peerprep-questions";

/**
 * Convert example input/output to test case format
 */
function convertExampleToTestCase(example: {
  input: string;
  output: string;
}): { input: string; expectedOutput: string } {
  // Extract the actual input value from examples like "nums = [2,7,11,15], target = 9"
  // or "s = \"abc\""
  let input = example.input;
  let expectedOutput = example.output;

  // For Two Sum format: "nums = [2,7,11,15], target = 9" -> "nums = [2,7,11,15], target = 9"
  // Keep the full format as it's used in code execution
  if (input.includes("=") && !input.trim().startsWith("[")) {
    // Already in the right format
    return { input, expectedOutput };
  }

  // For simple array format: "[2,7,11,15]" -> keep as is
  return { input, expectedOutput };
}

/**
 * Generate test cases from examples if available
 */
function generateTestCasesFromExamples(
  examples: Array<{ input: string; output: string }>
): Array<{ input: string; expectedOutput: string }> {
  if (!examples || examples.length === 0) {
    return [];
  }

  return examples.map((example) => convertExampleToTestCase(example));
}

/**
 * Get default test cases for common problem types
 */
function getDefaultTestCases(title: string): Array<{
  input: string;
  expectedOutput: string;
}> {
  const titleLower = title.toLowerCase();

  if (titleLower.includes("two sum")) {
    return [
      { input: "nums = [2,7,11,15], target = 9", expectedOutput: "[0,1]" },
      { input: "nums = [3,2,4], target = 6", expectedOutput: "[1,2]" },
      { input: "nums = [3,3], target = 6", expectedOutput: "[0,1]" },
    ];
  }

  if (titleLower.includes("binary search")) {
    return [
      { input: "nums = [-1,0,3,5,9,12], target = 9", expectedOutput: "4" },
      { input: "nums = [-1,0,3,5,9,12], target = 2", expectedOutput: "-1" },
    ];
  }

  if (titleLower.includes("reverse linked list")) {
    return [
      { input: "head = [1,2,3,4,5]", expectedOutput: "[5,4,3,2,1]" },
      { input: "head = [1,2]", expectedOutput: "[2,1]" },
      { input: "head = []", expectedOutput: "[]" },
    ];
  }

  if (titleLower.includes("valid parentheses")) {
    return [
      { input: 's = "()"', expectedOutput: "true" },
      { input: 's = "()[]{}"', expectedOutput: "true" },
      { input: 's = "(]"', expectedOutput: "false" },
    ];
  }

  if (titleLower.includes("merge two sorted lists")) {
    return [
      {
        input: "list1 = [1,2,4], list2 = [1,3,4]",
        expectedOutput: "[1,1,2,3,4,4]",
      },
      { input: "list1 = [], list2 = []", expectedOutput: "[]" },
      { input: "list1 = [], list2 = [0]", expectedOutput: "[0]" },
    ];
  }

  if (titleLower.includes("longest substring")) {
    return [
      { input: 's = "abcabcbb"', expectedOutput: "3" },
      { input: 's = "bbbbb"', expectedOutput: "1" },
      { input: 's = "pwwkew"', expectedOutput: "3" },
    ];
  }

  if (titleLower.includes("add two numbers")) {
    return [
      { input: "l1 = [2,4,3], l2 = [5,6,4]", expectedOutput: "[7,0,8]" },
      { input: "l1 = [0], l2 = [0]", expectedOutput: "[0]" },
    ];
  }

  if (titleLower.includes("container with most water")) {
    return [
      { input: "height = [1,8,6,2,5,4,8,3,7]", expectedOutput: "49" },
    ];
  }

  if (titleLower.includes("climbing stairs")) {
    return [
      { input: "n = 2", expectedOutput: "2" },
      { input: "n = 3", expectedOutput: "3" },
    ];
  }

  if (titleLower.includes("maximum subarray")) {
    return [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        expectedOutput: "6",
      },
      { input: "nums = [1]", expectedOutput: "1" },
      { input: "nums = [5,4,-1,7,8]", expectedOutput: "23" },
    ];
  }

  if (titleLower.includes("merge k sorted lists")) {
    return [
      {
        input: "lists = [[1,4,5],[1,3,4],[2,6]]",
        expectedOutput: "[1,1,2,3,4,4,5,6]",
      },
      { input: "lists = []", expectedOutput: "[]" },
      { input: "lists = [[]]", expectedOutput: "[]" },
    ];
  }

  if (titleLower.includes("trapping rain water")) {
    return [
      {
        input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        expectedOutput: "6",
      },
      { input: "height = [4,2,0,3,2,5]", expectedOutput: "9" },
    ];
  }

  return [];
}

async function addTestCasesToQuestions() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find all questions
    const questions = await Question.find({});
    console.log(`Found ${questions.length} questions`);

    let updated = 0;
    let skipped = 0;

    for (const question of questions) {
      // Check if question already has test cases
      if (
        question.testCases &&
        Array.isArray(question.testCases) &&
        question.testCases.length > 0
      ) {
        console.log(`✓ "${question.title}" already has test cases`);
        skipped++;
        continue;
      }

      let testCases: Array<{ input: string; expectedOutput: string }> = [];

      // First, try to generate from examples
      if (question.examples && question.examples.length > 0) {
        testCases = generateTestCasesFromExamples(question.examples);
        console.log(
          `  Generated ${testCases.length} test cases from examples for "${question.title}"`
        );
      }

      // If no test cases from examples, try default test cases
      if (testCases.length === 0) {
        testCases = getDefaultTestCases(question.title);
        if (testCases.length > 0) {
          console.log(
            `  Using ${testCases.length} default test cases for "${question.title}"`
          );
        }
      }

      // If still no test cases, create a placeholder
      if (testCases.length === 0) {
        testCases = [
          {
            input: "Input not specified",
            expectedOutput: "Output not specified",
          },
        ];
        console.log(
          `  ⚠ Created placeholder test case for "${question.title}"`
        );
      }

      // Update the question
      question.testCases = testCases;
      await question.save();
      console.log(`✓ Updated "${question.title}" with ${testCases.length} test case(s)`);
      updated++;
    }

    console.log("\n=== Summary ===");
    console.log(`Total questions: ${questions.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (already had test cases): ${skipped}`);

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
addTestCasesToQuestions();

