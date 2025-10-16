import mongoose, { Schema, Document } from "mongoose";
import { IQuestion, Difficulty, Category } from "../types";

export interface IQuestionDocument extends Omit<IQuestion, "id">, Document {
  _id: string;
}

const QuestionSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    categories: {
      type: [String],
      required: true,
      enum: Object.values(Category),
      validate: {
        validator: function (v: string[]) {
          return v && v.length > 0;
        },
        message: "At least one category is required",
      },
    },
    difficulty: {
      type: String,
      required: true,
      enum: Object.values(Difficulty),
    },
    link: {
      type: String,
      trim: true,
    },
    examples: [
      {
        input: {
          type: String,
          required: true,
        },
        output: {
          type: String,
          required: true,
        },
        explanation: String,
      },
    ],
    constraints: [String],
    testCases: [
      {
        input: {
          type: String,
          required: true,
        },
        expectedOutput: {
          type: String,
          required: true,
        },
      },
    ],
    hints: [String],
  },
  {
    timestamps: true,
  }
);

// Create compound indexes for better query performance
QuestionSchema.index({ title: "text", description: "text" });
QuestionSchema.index({ difficulty: 1, categories: 1 });
QuestionSchema.index({ categories: 1, difficulty: 1 });
QuestionSchema.index({ createdAt: -1 });
QuestionSchema.index({ difficulty: 1, createdAt: -1 });
QuestionSchema.index({ categories: 1, createdAt: -1 });

// Sparse index for optional fields
QuestionSchema.index({ link: 1 }, { sparse: true });

// Ensure unique title constraint
QuestionSchema.index({ title: 1 }, { unique: true });

export default mongoose.model<IQuestionDocument>("Question", QuestionSchema);
