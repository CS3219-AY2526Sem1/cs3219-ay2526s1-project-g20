import express, { Application } from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import chatbotRoutes from "./routes/chatbotRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { performanceMiddleware } from "./middleware/performance";
import chatbotService from "./services/chatbotService";

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:8080",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
      "http://127.0.0.1:8080",
      "file://",
      "null",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Performance monitoring
app.use(performanceMiddleware);

// Health check endpoint
app.get("/health", (req, res) => {
  try {
    const conversationsCount = chatbotService.getAllConversations().length;
    res.status(200).json({
      success: true,
      message: "Chatbot service is running",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      statistics: {
        activeConversations: conversationsCount,
        openaiConfigured:
          !!process.env.OPENAI_API_KEY &&
          process.env.OPENAI_API_KEY !== "your_openai_api_key_here",
      },
      version: "1.0.0",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Health check failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// Metrics endpoint
app.get("/metrics", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
    },
  });
});

// API routes
app.use("/api/chatbot", chatbotRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server
const startServer = async () => {
  try {
    // Start listening
    app.listen(PORT, () => {
      console.log(`Chatbot service is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API endpoints: http://localhost:${PORT}/api/chatbot`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
