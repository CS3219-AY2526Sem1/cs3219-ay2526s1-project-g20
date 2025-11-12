import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

export const validateChatMessage = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ max: 2000 })
    .withMessage("Message must be at most 2000 characters"),

  body("conversationId")
    .optional()
    .isUUID()
    .withMessage("Conversation ID must be a valid UUID"),

  body("mode")
    .optional()
    .isIn(["coding", "explanation", "hint", "general"])
    .withMessage("Invalid mode value"),

  body("context")
    .optional()
    .isObject()
    .withMessage("Context must be an object"),
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

