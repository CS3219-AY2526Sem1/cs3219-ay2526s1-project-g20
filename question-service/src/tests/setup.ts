import mongoose from "mongoose";

// Setup for tests
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI =
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/peerprep-questions-test";
});

afterAll(async () => {
  // Clean up after all tests
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

// Global test timeout
jest.setTimeout(10000);
