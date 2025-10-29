#!/bin/bash

BASE_URL="http://localhost:3001/api/questions"

add_question() {
  curl -s -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d "$1" | jq -r '.success'
}

echo "Adding questions..."

# Question 1
add_question '{
  "title": "Remove Duplicates from Sorted Array",
  "description": "Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. Return k after placing the final result in the first k slots of nums.",
  "categories": ["Arrays"],
  "difficulty": "Easy",
  "constraints": ["1 <= nums.length <= 3 * 10^4", "-100 <= nums[i] <= 100", "nums is sorted in non-decreasing order"],
  "examples": [{"input": "nums = [1,1,2]", "output": "2, nums = [1,2,_]"}, {"input": "nums = [0,0,1,1,1,2,2,3,3,4]", "output": "5, nums = [0,1,2,3,4,_,_,_,_,_]"}],
  "testCases": [{"input": "[1,1,2]", "expectedOutput": "2"}, {"input": "[0,0,1,1,1,2,2,3,3,4]", "expectedOutput": "5"}, {"input": "[1]", "expectedOutput": "1"}],
  "hints": ["Use two pointers", "Compare current with next", "Skip duplicates"]
}'

# Question 2
add_question '{
  "title": "Best Time to Buy and Sell Stock",
  "description": "You are given an array prices where prices[i] is the price of a given stock on day i. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.",
  "categories": ["Arrays", "Dynamic Programming"],
  "difficulty": "Easy",
  "constraints": ["1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"],
  "examples": [{"input": "prices = [7,1,5,3,6,4]", "output": "5"}, {"input": "prices = [7,6,4,3,1]", "output": "0"}],
  "testCases": [{"input": "[7,1,5,3,6,4]", "expectedOutput": "5"}, {"input": "[7,6,4,3,1]", "expectedOutput": "0"}, {"input": "[1,2]", "expectedOutput": "1"}],
  "hints": ["Track minimum price", "Track maximum profit", "One pass solution"]
}'

# Question 3
add_question '{
  "title": "Contains Duplicate",
  "description": "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
  "categories": ["Arrays"],
  "difficulty": "Easy",
  "constraints": ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
  "examples": [{"input": "nums = [1,2,3,1]", "output": "true"}, {"input": "nums = [1,2,3,4]", "output": "false"}],
  "testCases": [{"input": "[1,2,3,1]", "expectedOutput": "true"}, {"input": "[1,2,3,4]", "expectedOutput": "false"}, {"input": "[1,1,1,3,3,4,3,2,4,2]", "expectedOutput": "true"}],
  "hints": ["Use HashSet", "Check if element exists before adding"]
}'

# Question 4
add_question '{
  "title": "Product of Array Except Self",
  "description": "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. You must write an algorithm that runs in O(n) time and without using the division operator.",
  "categories": ["Arrays"],
  "difficulty": "Medium",
  "constraints": ["2 <= nums.length <= 10^5", "-30 <= nums[i] <= 30", "The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer"],
  "examples": [{"input": "nums = [1,2,3,4]", "output": "[24,12,8,6]"}, {"input": "nums = [-1,1,0,-3,3]", "output": "[0,0,9,0,0]"}],
  "testCases": [{"input": "[1,2,3,4]", "expectedOutput": "[24,12,8,6]"}, {"input": "[-1,1,0,-3,3]", "expectedOutput": "[0,0,9,0,0]"}],
  "hints": ["Use two passes", "Left products and right products", "Result is left * right"]
}'

# Question 5
add_question '{
  "title": "Maximum Product Subarray",
  "description": "Given an integer array nums, find a contiguous non-empty subarray within the array that has the largest product, and return the product.",
  "categories": ["Arrays", "Dynamic Programming"],
  "difficulty": "Medium",
  "constraints": ["1 <= nums.length <= 2 * 10^4", "-10 <= nums[i] <= 10"],
  "examples": [{"input": "nums = [2,3,-2,4]", "output": "6"}, {"input": "nums = [-2,0,-1]", "output": "0"}],
  "testCases": [{"input": "[2,3,-2,4]", "expectedOutput": "6"}, {"input": "[-2,0,-1]", "expectedOutput": "0"}],
  "hints": ["Track max and min", "Handle negative numbers", "Reset when encountering zero"]
}'

# Question 6
add_question '{
  "title": "Find Minimum in Rotated Sorted Array",
  "description": "Suppose an array of length n sorted in ascending order is rotated between 1 and n times. Given the sorted rotated array nums of unique elements, return the minimum element of this array.",
  "categories": ["Arrays", "Binary Search"],
  "difficulty": "Medium",
  "constraints": ["n == nums.length", "1 <= n <= 5000", "-5000 <= nums[i] <= 5000", "All the integers of nums are unique.", "nums is sorted and rotated between 1 and n times"],
  "examples": [{"input": "nums = [3,4,5,1,2]", "output": "1"}, {"input": "nums = [4,5,6,7,0,1,2]", "output": "0"}],
  "testCases": [{"input": "[3,4,5,1,2]", "expectedOutput": "1"}, {"input": "[4,5,6,7,0,1,2]", "expectedOutput": "0"}],
  "hints": ["Binary search", "Compare with right boundary", "Find the pivot point"]
}'

# Question 7
add_question '{
  "title": "Search in Rotated Sorted Array",
  "description": "There is an integer array nums sorted in ascending order (with distinct values). Prior to being passed to your function, nums is rotated at an unknown pivot index k. Given the array nums after the rotation and an integer target, return the index of target if it is in nums, or -1 if it is not in nums.",
  "categories": ["Arrays", "Binary Search"],
  "difficulty": "Medium",
  "constraints": ["1 <= nums.length <= 5000", "-10^4 <= nums[i] <= 10^4", "All values of nums are unique", "nums is an ascending array that is possibly rotated", "-10^4 <= target <= 10^4"],
  "examples": [{"input": "nums = [4,5,6,7,0,1,2], target = 0", "output": "4"}, {"input": "nums = [4,5,6,7,0,1,2], target = 3", "output": "-1"}],
  "testCases": [{"input": "[4,5,6,7,0,1,2] 0", "expectedOutput": "4"}, {"input": "[4,5,6,7,0,1,2] 3", "expectedOutput": "-1"}],
  "hints": ["Binary search with rotation handling", "Identify sorted half", "Adjust search space based on rotation"]
}'

# Question 8
add_question '{
  "title": "Container With Most Water",
  "description": "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water.",
  "categories": ["Arrays", "Two Pointers"],
  "difficulty": "Medium",
  "constraints": ["n == height.length", "2 <= n <= 10^5", "0 <= height[i] <= 10^4"],
  "examples": [{"input": "height = [1,8,6,2,5,4,8,3,7]", "output": "49"}, {"input": "height = [1,1]", "output": "1"}],
  "testCases": [{"input": "[1,8,6,2,5,4,8,3,7]", "expectedOutput": "49"}, {"input": "[1,1]", "expectedOutput": "1"}],
  "hints": ["Two pointers approach", "Start from both ends", "Move pointer with smaller height"]
}'

# Question 9
add_question '{
  "title": "3Sum",
  "description": "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.",
  "categories": ["Arrays", "Sorting"],
  "difficulty": "Medium",
  "constraints": ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
  "examples": [{"input": "nums = [-1,0,1,2,-1,-4]", "output": "[[-1,-1,2],[-1,0,1]]"}, {"input": "nums = [0,1,1]", "output": "[]"}],
  "testCases": [{"input": "[-1,0,1,2,-1,-4]", "expectedOutput": "[[-1,-1,2],[-1,0,1]]"}, {"input": "[0,1,1]", "expectedOutput": "[]"}],
  "hints": ["Sort array first", "Use two pointers", "Skip duplicates"]
}'

# Question 10
add_question '{
  "title": "Group Anagrams",
  "description": "Given an array of strings strs, group the anagrams together. You can return the answer in any order.",
  "categories": ["Strings", "Sorting"],
  "difficulty": "Medium",
  "constraints": ["1 <= strs.length <= 10^4", "0 <= strs[i].length <= 100", "strs[i] consists of lowercase English letters"],
  "examples": [{"input": "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]", "output": "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]"}, {"input": "strs = [\"\"]", "output": "[[\"\"]]"}],
  "testCases": [{"input": "[\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]", "expectedOutput": "grouped"}, {"input": "[\"\"]", "expectedOutput": "[[\"\"]]"}],
  "hints": ["Sort characters to create key", "Use HashMap", "Group by sorted string"]
}'

echo "Completed adding questions!"

