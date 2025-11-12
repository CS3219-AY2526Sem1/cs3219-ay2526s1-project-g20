def solution(nums, target):
    """
    Two Sum solution using hash map for O(n) time complexity.
    
    Args:
        nums: List of integers
        target: Target sum
    
    Returns:
        List of two indices [i, j] such that nums[i] + nums[j] == target
    """
    # Dictionary to store number -> index mapping
    seen = {}
    
    # Iterate through the array
    for i, num in enumerate(nums):
        # Calculate the complement (what number we need to find)
        complement = target - num
        
        # Check if complement exists in our seen dictionary
        if complement in seen:
            # Found the pair! Return the indices
            return [seen[complement], i]
        
        # Store current number and its index
        seen[num] = i
    
    # No solution found (shouldn't happen per problem constraints)
    return []

# Alternative solution using brute force (for reference, but slower O(n^2)):
# def solution(nums, target):
#     for i in range(len(nums)):
#         for j in range(i + 1, len(nums)):
#             if nums[i] + nums[j] == target:
#                 return [i, j]
#     return []

