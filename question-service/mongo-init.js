// MongoDB initialization script
db = db.getSiblingDB("peerprep-questions");

// Create collections with optimized settings
db.createCollection("questions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "description", "categories", "difficulty"],
      properties: {
        title: {
          bsonType: "string",
          maxLength: 200,
          description: "must be a string and is required",
        },
        description: {
          bsonType: "string",
          description: "must be a string and is required",
        },
        categories: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "string",
            enum: [
              "Arrays",
              "Algorithms",
              "Data Structures",
              "Dynamic Programming",
              "Math",
              "Strings",
              "Searching",
              "Sorting",
              "Greedy",
            ],
          },
          description: "must be an array with at least one valid category",
        },
        difficulty: {
          bsonType: "string",
          enum: ["Easy", "Medium", "Hard"],
          description: "must be a string and is required",
        },
        link: {
          bsonType: "string",
          description: "must be a string if present",
        },
        examples: {
          bsonType: "array",
          description: "must be an array if present",
        },
        constraints: {
          bsonType: "array",
          description: "must be an array if present",
        },
        testCases: {
          bsonType: "array",
          description: "must be an array if present",
        },
        hints: {
          bsonType: "array",
          description: "must be an array if present",
        },
      },
    },
  },
});

// Create indexes for optimal performance
db.questions.createIndex({ title: "text", description: "text" });
db.questions.createIndex({ difficulty: 1, categories: 1 });
db.questions.createIndex({ categories: 1, difficulty: 1 });
db.questions.createIndex({ createdAt: -1 });
db.questions.createIndex({ difficulty: 1, createdAt: -1 });
db.questions.createIndex({ categories: 1, createdAt: -1 });
db.questions.createIndex({ title: 1 }, { unique: true });
db.questions.createIndex({ link: 1 }, { sparse: true });

print("Database and collections initialized successfully");
