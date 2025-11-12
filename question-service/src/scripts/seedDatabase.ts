import mongoose from "mongoose";
import dotenv from "dotenv";
import Question from "../models/Question";
import sampleQuestions from "../../sample-questions.json";

// Load environment variables
dotenv.config();

const seedDatabase = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/peerprep-questions";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Clear existing questions
    await Question.deleteMany({});
    console.log("Cleared existing questions");

    // Insert sample questions in batches for better performance
    const batchSize = 100;
    const questions = [];

    for (let i = 0; i < sampleQuestions.length; i += batchSize) {
      const batch = sampleQuestions.slice(i, i + batchSize);
      const batchQuestions = await Question.insertMany(batch);
      questions.push(...batchQuestions);
      console.log(
        `Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          sampleQuestions.length / batchSize
        )}`
      );
    }

    console.log(`Seeded ${questions.length} questions successfully`);

    // Display some statistics
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
    console.log("Difficulty Distribution:");
    difficultyStats.forEach((stat) => {
      console.log(`  ${stat._id}: ${stat.count} questions`);
    });

    console.log("\nTop Categories:");
    categoryStats.slice(0, 5).forEach((stat) => {
      console.log(`  ${stat._id}: ${stat.count} questions`);
    });

    console.log("\nDatabase seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run the seed function
seedDatabase();
