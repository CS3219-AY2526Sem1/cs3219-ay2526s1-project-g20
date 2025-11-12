import mongoose from "mongoose";
import dotenv from "dotenv";
import Question from "../models/Question";
import sampleQuestions from "../../sample-questions.json";

// Load environment variables
dotenv.config();

const addQuestions = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/peerprep-questions";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Get existing question titles to avoid duplicates
    const existingQuestions = await Question.find({}, { title: 1, _id: 0 });
    const existingTitles = new Set(
      existingQuestions.map((q) => q.title.toLowerCase())
    );
    console.log(`Found ${existingTitles.size} existing questions`);

    // Filter out questions that already exist
    const newQuestions = sampleQuestions.filter(
      (q) => !existingTitles.has(q.title.toLowerCase())
    );

    if (newQuestions.length === 0) {
      console.log("No new questions to add. All questions already exist in the database.");
    } else {
      // Insert only new questions
      const batchSize = 100;
      const questions = [];

      for (let i = 0; i < newQuestions.length; i += batchSize) {
        const batch = newQuestions.slice(i, i + batchSize);
        const batchQuestions = await Question.insertMany(batch, {
          ordered: false,
        });
        questions.push(...batchQuestions);
        console.log(
          `Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            newQuestions.length / batchSize
          )}`
        );
      }

      console.log(`Added ${questions.length} new questions successfully`);
    }

    // Display some statistics
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
    console.log(`Total questions: ${totalQuestions}`);
    console.log("Difficulty Distribution:");
    difficultyStats.forEach((stat) => {
      console.log(`  ${stat._id}: ${stat.count} questions`);
    });

    console.log("\nTop Categories:");
    categoryStats.slice(0, 10).forEach((stat) => {
      console.log(`  ${stat._id}: ${stat.count} questions`);
    });

    console.log("\nQuestions addition completed successfully!");
  } catch (error) {
    console.error("Error adding questions:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run the add function
addQuestions();

