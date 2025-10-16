import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { Difficulty, Category } from "../types";

export const validateQuestion = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title must be at most 200 characters"),

  body("description").trim().notEmpty().withMessage("Description is required"),

  body("categories")
    .isArray({ min: 1 })
    .withMessage("At least one category is required")
    .custom((categories) => {
      const validCategories = Object.values(Category);
      return categories.every((cat: string) =>
        validCategories.includes(cat as Category)
      );
    })
    .withMessage("Invalid category value"),

  body("difficulty")
    .notEmpty()
    .withMessage("Difficulty is required")
    .isIn(Object.values(Difficulty))
    .withMessage("Invalid difficulty value"),

  body("link")
    .optional()
    .trim()
    .isURL()
    .withMessage("Link must be a valid URL"),

  body("examples")
    .optional()
    .isArray()
    .withMessage("Examples must be an array"),

  body("constraints")
    .optional()
    .isArray()
    .withMessage("Constraints must be an array"),

  body("testCases")
    .optional()
    .isArray()
    .withMessage("Test cases must be an array"),

  body("hints").optional().isArray().withMessage("Hints must be an array"),
];

export const validateAIGeneration = [
  body("difficulty")
    .notEmpty()
    .withMessage("Difficulty is required")
    .isIn(Object.values(Difficulty))
    .withMessage("Invalid difficulty value"),

  body("categories")
    .isArray({ min: 1 })
    .withMessage("At least one category is required")
    .custom((categories) => {
      const validCategories = Object.values(Category);
      return categories.every((cat: string) =>
        validCategories.includes(cat as Category)
      );
    })
    .withMessage("Invalid category value"),

  body("topic")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Topic must be between 1 and 100 characters"),

  body("count")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Count must be between 1 and 5"),
];

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
    return;
  }

  next();
};
