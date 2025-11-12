import mongoose from "mongoose";
import Question from "../models/Question";
import { IQuestion, Difficulty, Category } from "../types";

const leetCodeQuestions: IQuestion[] = [
  {
    title: "Two Sum",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    categories: [Category.ARRAYS, Category.DATA_STRUCTURES],
    difficulty: Difficulty.EASY,
    link: "https://leetcode.com/problems/two-sum/",
    images: [
      {
        url: "https://assets.leetcode.com/uploads/2020/09/14/two-sum.png",
        alt: "Two Sum problem visualization showing array [2,7,11,15] with target 9",
        caption:
          "Visual representation of the Two Sum problem with array elements and target value",
      },
    ],
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
        explanation: "Because nums[1] + nums[2] == 6, we return [1, 2].",
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 6, we return [0, 1].",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    testCases: [
      {
        input: "[2,7,11,15]",
        expectedOutput: "[0,1]",
      },
      {
        input: "[3,2,4]",
        expectedOutput: "[1,2]",
      },
      {
        input: "[3,3]",
        expectedOutput: "[0,1]",
      },
    ],
    hints: [
      "A really brute force way would be to search for all possible pairs of numbers but that would be too slow. Again, the thing with arrays is that we usually want to iterate through them.",
      "So, if we fix one of the numbers, say x, we have to scan the entire array to find the next number y which is value - x where value is the input parameter. Can we change our array somehow so that this search becomes faster?",
      "The second train of thought is, without changing the array, can we use additional space somehow? Like maybe a hash map to speed up the search?",
    ],
  },
  {
    title: "Best Time to Buy and Sell Stock",
    description:
      "You are given an array prices where prices[i] is the price of a given stock on the ith day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.",
    categories: [Category.ARRAYS, Category.DYNAMIC_PROGRAMMING],
    difficulty: Difficulty.EASY,
    link: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/",
    images: [
      {
        url: "https://assets.leetcode.com/uploads/2020/09/14/best-time-to-buy-and-sell-stock.png",
        alt: "Stock price chart showing daily prices and optimal buy/sell points",
        caption:
          "Stock price visualization showing the optimal buying and selling strategy",
      },
    ],
    examples: [
      {
        input: "prices = [7,1,5,3,6,4]",
        output: "5",
        explanation:
          "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5. Note that buying on day 2 and selling on day 1 is not allowed because you must buy before you sell.",
      },
      {
        input: "prices = [7,6,4,3,1]",
        output: "0",
        explanation:
          "In this case, no transactions are done and the max profit = 0.",
      },
    ],
    constraints: ["1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"],
    testCases: [
      {
        input: "[7,1,5,3,6,4]",
        expectedOutput: "5",
      },
      {
        input: "[7,6,4,3,1]",
        expectedOutput: "0",
      },
    ],
    hints: [
      "The points of interest are the peaks and valleys of the graph of stock prices over time.",
      "If we plot the numbers of the given array on a graph, we get:",
      "The key insight is that the maximum profit can be obtained by finding the minimum price and the maximum price that comes after it.",
    ],
  },
  {
    title: "Valid Parentheses",
    description:
      "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    categories: [Category.STRINGS, Category.DATA_STRUCTURES],
    difficulty: Difficulty.EASY,
    link: "https://leetcode.com/problems/valid-parentheses/",
    images: [
      {
        url: "https://assets.leetcode.com/uploads/2020/09/14/valid-parentheses.png",
        alt: "Stack-based approach visualization for valid parentheses problem",
        caption: "Stack data structure approach for matching parentheses",
      },
    ],
    examples: [
      {
        input: 's = "()"',
        output: "true",
        explanation: "The string contains valid parentheses.",
      },
      {
        input: 's = "()[]{}"',
        output: "true",
        explanation: "All types of brackets are properly closed.",
      },
      {
        input: 's = "(]"',
        output: "false",
        explanation: "The closing bracket doesn't match the opening bracket.",
      },
    ],
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only '()[]{}'.",
    ],
    testCases: [
      {
        input: '"()"',
        expectedOutput: "true",
      },
      {
        input: '"()[]{}"',
        expectedOutput: "true",
      },
      {
        input: '"(]"',
        expectedOutput: "false",
      },
    ],
    hints: [
      "Use a stack to keep track of opening brackets.",
      "When you encounter a closing bracket, check if it matches the most recent opening bracket.",
      "If the stack is empty when you encounter a closing bracket, or if the brackets don't match, the string is invalid.",
    ],
  },
  {
    title: "Maximum Subarray",
    description:
      "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.\n\nA subarray is a contiguous part of an array.",
    categories: [
      Category.ARRAYS,
      Category.ALGORITHMS,
      Category.DYNAMIC_PROGRAMMING,
    ],
    difficulty: Difficulty.MEDIUM,
    link: "https://leetcode.com/problems/maximum-subarray/",
    images: [
      {
        url: "https://assets.leetcode.com/uploads/2020/09/14/maximum-subarray.png",
        alt: "Kadane's algorithm visualization showing subarray with maximum sum",
        caption: "Kadane's algorithm approach for finding maximum subarray sum",
      },
    ],
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum 6.",
      },
      {
        input: "nums = [1]",
        output: "1",
        explanation: "The subarray [1] has the largest sum 1.",
      },
      {
        input: "nums = [5,4,-1,7,8]",
        output: "23",
        explanation: "The subarray [5,4,-1,7,8] has the largest sum 23.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
    testCases: [
      {
        input: "[-2,1,-3,4,-1,2,1,-5,4]",
        expectedOutput: "6",
      },
      {
        input: "[1]",
        expectedOutput: "1",
      },
      {
        input: "[5,4,-1,7,8]",
        expectedOutput: "23",
      },
    ],
    hints: [
      "This is a classic dynamic programming problem.",
      "At each position, decide whether to start a new subarray or extend the existing one.",
      "Keep track of the maximum sum seen so far.",
    ],
  },
  {
    title: "Climbing Stairs",
    description:
      "You are climbing a staircase. It takes n steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    categories: [
      Category.MATH,
      Category.DYNAMIC_PROGRAMMING,
      Category.ALGORITHMS,
    ],
    difficulty: Difficulty.EASY,
    link: "https://leetcode.com/problems/climbing-stairs/",
    images: [
      {
        url: "https://assets.leetcode.com/uploads/2020/09/14/climbing-stairs.png",
        alt: "Staircase visualization showing different ways to climb stairs",
        caption: "Fibonacci sequence approach for climbing stairs problem",
      },
    ],
    examples: [
      {
        input: "n = 2",
        output: "2",
        explanation:
          "There are two ways to climb to the top: 1. 1 step + 1 step, 2. 2 steps",
      },
      {
        input: "n = 3",
        output: "3",
        explanation:
          "There are three ways to climb to the top: 1. 1 step + 1 step + 1 step, 2. 1 step + 2 steps, 3. 2 steps + 1 step",
      },
    ],
    constraints: ["1 <= n <= 45"],
    testCases: [
      {
        input: "2",
        expectedOutput: "2",
      },
      {
        input: "3",
        expectedOutput: "3",
      },
      {
        input: "4",
        expectedOutput: "5",
      },
    ],
    hints: [
      "This is essentially a Fibonacci sequence problem.",
      "The number of ways to reach step n is the sum of ways to reach step n-1 and step n-2.",
      "Use dynamic programming to avoid recalculating the same subproblems.",
    ],
  },
  {
    title: "Binary Tree Inorder Traversal",
    description:
      "Given the root of a binary tree, return the inorder traversal of its nodes' values.",
    categories: [
      Category.DATA_STRUCTURES,
      Category.TREES,
      Category.SEARCHING,
      Category.ALGORITHMS,
    ],
    difficulty: Difficulty.EASY,
    link: "https://leetcode.com/problems/binary-tree-inorder-traversal/",
    images: [
      {
        url: "https://assets.leetcode.com/uploads/2020/09/14/binary-tree-inorder-traversal.png",
        alt: "Binary tree with inorder traversal path highlighted",
        caption: "Inorder traversal: left -> root -> right",
      },
    ],
    examples: [
      {
        input: "root = [1,null,2,3]",
        output: "[1,3,2]",
        explanation: "Inorder traversal: left -> root -> right",
      },
      {
        input: "root = []",
        output: "[]",
        explanation: "Empty tree has no nodes to traverse.",
      },
      {
        input: "root = [1]",
        output: "[1]",
        explanation: "Single node tree.",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 100].",
      "-100 <= Node.val <= 100",
    ],
    testCases: [
      {
        input: "[1,null,2,3]",
        expectedOutput: "[1,3,2]",
      },
      {
        input: "[]",
        expectedOutput: "[]",
      },
      {
        input: "[1]",
        expectedOutput: "[1]",
      },
    ],
    hints: [
      "Inorder traversal visits nodes in the order: left subtree, root, right subtree.",
      "You can solve this recursively or iteratively using a stack.",
      "For the iterative approach, use a stack to simulate the recursion.",
    ],
  },
  {
    title: "Symmetric Tree",
    description:
      "Given the root of a binary tree, check whether it is a mirror of itself (i.e., symmetric around its center).",
    categories: [Category.TREES, Category.SEARCHING, Category.ALGORITHMS],
    difficulty: Difficulty.EASY,
    link: "https://leetcode.com/problems/symmetric-tree/",
    images: [
      {
        url: "https://assets.leetcode.com/uploads/2020/09/14/symmetric-tree.png",
        alt: "Symmetric binary tree visualization showing mirror structure",
        caption: "Symmetric tree structure with mirror reflection",
      },
    ],
    examples: [
      {
        input: "root = [1,2,2,3,4,4,3]",
        output: "true",
        explanation: "The binary tree is symmetric.",
      },
      {
        input: "root = [1,2,2,null,3,null,3]",
        output: "false",
        explanation: "The binary tree is not symmetric.",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [1, 1000].",
      "-100 <= Node.val <= 100",
    ],
    testCases: [
      {
        input: "[1,2,2,3,4,4,3]",
        expectedOutput: "true",
      },
      {
        input: "[1,2,2,null,3,null,3]",
        expectedOutput: "false",
      },
    ],
    hints: [
      "A tree is symmetric if the left subtree is a mirror reflection of the right subtree.",
      "Two trees are mirror images if their roots have the same value and the left subtree of one is a mirror of the right subtree of the other.",
      "Use recursion to compare corresponding nodes.",
    ],
  },
  {
    title: "Maximum Depth of Binary Tree",
    description:
      "Given the root of a binary tree, return its maximum depth.\n\nA binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
    categories: [Category.TREES, Category.SEARCHING, Category.ALGORITHMS],
    difficulty: Difficulty.EASY,
    link: "https://leetcode.com/problems/maximum-depth-of-binary-tree/",
    images: [
      {
        url: "https://assets.leetcode.com/uploads/2020/09/14/maximum-depth-of-binary-tree.png",
        alt: "Binary tree with depth levels highlighted",
        caption: "Maximum depth calculation using DFS approach",
      },
    ],
    examples: [
      {
        input: "root = [3,9,20,null,null,15,7]",
        output: "3",
        explanation: "The tree has a maximum depth of 3.",
      },
      {
        input: "root = [1,null,2]",
        output: "2",
        explanation: "The tree has a maximum depth of 2.",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 10^4].",
      "-100 <= Node.val <= 100",
    ],
    testCases: [
      {
        input: "[3,9,20,null,null,15,7]",
        expectedOutput: "3",
      },
      {
        input: "[1,null,2]",
        expectedOutput: "2",
      },
    ],
    hints: [
      "The maximum depth of a tree is 1 + the maximum depth of its left and right subtrees.",
      "Use recursion to calculate the depth of each subtree.",
      "The base case is when the node is null, return 0.",
    ],
  },
  {
    title: "Convert Sorted Array to Binary Search Tree",
    description:
      "Given an integer array nums where the elements are sorted in ascending order, convert it to a height-balanced binary search tree.\n\nA height-balanced binary tree is a binary tree in which the depth of the two subtrees of every node never differs by more than one.",
    categories: [Category.ARRAYS, Category.ALGORITHMS, Category.TREES],
    difficulty: Difficulty.EASY,
    link: "https://leetcode.com/problems/convert-sorted-array-to-binary-search-tree/",
    images: [
      {
        url: "https://assets.leetcode.com/uploads/2020/09/14/convert-sorted-array-to-binary-search-tree.png",
        alt: "Sorted array conversion to height-balanced BST",
        caption: "Divide and conquer approach for creating balanced BST",
      },
    ],
    examples: [
      {
        input: "nums = [-10,-3,0,5,9]",
        output: "[0,-3,9,-10,null,5]",
        explanation:
          "One possible answer is [0,-3,9,-10,null,5], which represents the height-balanced BST.",
      },
      {
        input: "nums = [1,3]",
        output: "[3,1]",
        explanation: "One possible answer is [3,1].",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10^4",
      "-10^4 <= nums[i] <= 10^4",
      "nums is sorted in a strictly increasing order.",
    ],
    testCases: [
      {
        input: "[-10,-3,0,5,9]",
        expectedOutput: "[0,-3,9,-10,null,5]",
      },
      {
        input: "[1,3]",
        expectedOutput: "[3,1]",
      },
    ],
    hints: [
      "Use the middle element as the root to ensure the tree is height-balanced.",
      "Recursively build the left and right subtrees using the left and right halves of the array.",
      "The base case is when the array is empty, return null.",
    ],
  },
  {
    title: "Path Sum",
    description:
      "Given the root of a binary tree and an integer targetSum, return true if the tree has a root-to-leaf path such that adding up all the values along the path equals targetSum.\n\nA leaf is a node with no children.",
    categories: [Category.TREES, Category.SEARCHING, Category.ALGORITHMS],
    difficulty: Difficulty.EASY,
    link: "https://leetcode.com/problems/path-sum/",
    images: [
      {
        url: "https://assets.leetcode.com/uploads/2020/09/14/path-sum.png",
        alt: "Binary tree with path sum visualization",
        caption: "DFS approach for finding root-to-leaf path with target sum",
      },
    ],
    examples: [
      {
        input:
          "root = [5,4,8,11,null,13,4,7,2,null,null,null,1], targetSum = 22",
        output: "true",
        explanation: "The path 5->4->11->2 has sum 22.",
      },
      {
        input: "root = [1,2,3], targetSum = 5",
        output: "false",
        explanation: "There is no root-to-leaf path with sum 5.",
      },
      {
        input: "root = [], targetSum = 0",
        output: "false",
        explanation: "Empty tree has no paths.",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 5000].",
      "-1000 <= Node.val <= 1000",
      "-1000 <= targetSum <= 1000",
    ],
    testCases: [
      {
        input: "[5,4,8,11,null,13,4,7,2,null,null,null,1], 22",
        expectedOutput: "true",
      },
      {
        input: "[1,2,3], 5",
        expectedOutput: "false",
      },
      {
        input: "[], 0",
        expectedOutput: "false",
      },
    ],
    hints: [
      "Use DFS to traverse all root-to-leaf paths.",
      "Keep track of the current sum as you traverse down the tree.",
      "When you reach a leaf node, check if the current sum equals the target sum.",
    ],
  },
];

const seedLeetCodeQuestions = async () => {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/peerprep-questions";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Clear existing questions
    await Question.deleteMany({});
    console.log("Cleared existing questions");

    // Insert LeetCode questions
    await Question.insertMany(leetCodeQuestions);
    console.log(
      `Seeded ${leetCodeQuestions.length} LeetCode questions successfully`
    );

    // Log database statistics
    const totalQuestions = await Question.countDocuments();
    const difficultyStats = await Question.aggregate([
      { $group: { _id: "$difficulty", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const categoryStats = await Question.aggregate([
      { $unwind: "$categories" },
      { $group: { _id: "$categories", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log("\nDatabase Statistics:");
    console.log(`Total questions in database: ${totalQuestions}`);
    console.log("Difficulty Distribution:");
    difficultyStats.forEach((stat) => {
      console.log(`  ${stat._id}: ${stat.count} questions`);
    });

    console.log("\nTop Categories:");
    categoryStats.slice(0, 10).forEach((stat) => {
      console.log(`  ${stat._id}: ${stat.count} questions`);
    });

    console.log("\nLeetCode questions seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding LeetCode questions:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run the seed function
seedLeetCodeQuestions();
