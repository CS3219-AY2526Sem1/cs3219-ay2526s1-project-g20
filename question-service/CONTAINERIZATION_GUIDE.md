# Question Service - Containerization Guide

## 🐳 Overview

This guide explains how to containerize and deploy the Question Service microservice using Docker, and how other services can connect to it.

## 📋 Prerequisites

- Docker Desktop installed on your machine
- Basic understanding of Docker concepts
- Network access for inter-service communication

## 🚀 Quick Start

### 1. Build and Run the Service

```bash
# Navigate to the question-service directory
cd question-service

# Build and start all services (Question Service + MongoDB)
docker-compose up --build

# Run in detached mode (background)
docker-compose up --build -d
```

### 2. Verify Service is Running

```bash
# Check container status
docker-compose ps

# Test health endpoint
curl http://localhost:3001/health

# Test API endpoint
curl http://localhost:3001/api/questions
```

## 🌐 Network Configuration

### Your Machine's IP Address

**Current IP**: `10.249.19.34`

### Service Endpoints

- **Question Service**: `http://10.249.19.34:3001`
- **Health Check**: `http://10.249.19.34:3001/health`
- **API Base**: `http://10.249.19.34:3001/api/questions`
- **MongoDB**: `10.249.19.34:27017` (internal use only)

## 📡 API Endpoints

### Health & Monitoring

- `GET /health` - Service health check
- `GET /metrics` - System metrics

### Question Management

- `GET /api/questions` - List all questions
- `POST /api/questions` - Create new question
- `GET /api/questions/:id` - Get specific question
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question

### Statistics & Random

- `GET /api/questions/statistics` - Get question statistics
- `GET /api/questions/random` - Get random question

### AI Features

- `POST /api/questions/generate` - Generate questions with AI
- `POST /api/questions/generate-and-save` - Generate and save questions
- `GET /api/questions/ai/stats` - AI service statistics
- `DELETE /api/questions/ai/cache` - Clear AI cache

## 🔗 How Other Services Connect

### 1. HTTP Requests (Recommended)

Other services make HTTP requests to your Question Service instead of accessing MongoDB directly.

**JavaScript/Node.js Example:**

```javascript
// Fetch all questions
const response = await fetch("http://10.249.19.34:3001/api/questions");
const questions = await response.json();

// Create a new question
const newQuestion = await fetch("http://10.249.19.34:3001/api/questions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    title: "Two Sum",
    description: "Find two numbers that add up to target",
    difficulty: "Easy",
    categories: ["Arrays", "Algorithms"],
  }),
});
```

**Python Example:**

```python
import requests

# Get all questions
response = requests.get('http://10.249.19.34:3001/api/questions')
questions = response.json()

# Create a new question
new_question = requests.post('http://10.249.19.34:3001/api/questions',
    json={
        "title": "Two Sum",
        "description": "Find two numbers that add up to target",
        "difficulty": "Easy",
        "categories": ["Arrays"]
    }
)
```

**Java Example:**

```java
// Using Spring Boot RestTemplate
RestTemplate restTemplate = new RestTemplate();

// Get questions
String url = "http://10.249.19.34:3001/api/questions";
Question[] questions = restTemplate.getForObject(url, Question[].class);

// Create question
Question newQuestion = new Question("Two Sum", "Find two numbers...", "Easy", Arrays.asList("Arrays"));
restTemplate.postForObject(url, newQuestion, Question.class);
```

### 2. Frontend Integration

**React Example:**

```javascript
import React, { useState, useEffect } from "react";

function QuestionList() {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    // Fetch questions from your service
    fetch("http://10.249.19.34:3001/api/questions")
      .then((response) => response.json())
      .then((data) => setQuestions(data.data))
      .catch((error) => console.error("Error:", error));
  }, []);

  const createQuestion = async (questionData) => {
    const response = await fetch("http://10.249.19.34:3001/api/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(questionData),
    });
    return response.json();
  };

  return (
    <div>
      {questions.map((question) => (
        <div key={question._id}>
          <h3>{question.title}</h3>
          <p>{question.description}</p>
          <span>Difficulty: {question.difficulty}</span>
        </div>
      ))}
    </div>
  );
}
```

### 3. Service-to-Service Communication

**Microservice Architecture:**

```
┌─────────────────┐    HTTP Requests    ┌─────────────────┐
│   User Service  │ ──────────────────→ │ Question Service│
│                 │                     │ (Your Service)  │
└─────────────────┘                     └─────────────────┘
         │                                       │
         │                                       │
┌─────────────────┐                     ┌─────────────────┐
│ Matching Service│                     │ MongoDB         │
└─────────────────┘                     └─────────────────┘
```

## 🛠️ Docker Configuration

### Docker Compose Structure

```yaml
version: "3.8"

services:
  question-service:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/peerprep-questions
      - PORT=3001
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=peerprep-questions
    volumes:
      - mongo_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    restart: unless-stopped

volumes:
  mongo_data:
```

### Dockerfile Features

- Multi-stage build for optimized production image
- Node.js 20 Alpine base image
- Security: Non-root user execution
- Health checks included
- Production-ready configuration

## 🔧 Environment Configuration

### Environment Variables

```bash
NODE_ENV=production
MONGODB_URI=mongodb://mongo:27017/peerprep-questions
PORT=3001
```

### For Other Services

```bash
# Environment variable for other services
QUESTION_SERVICE_URL=http://10.249.19.34:3001
```

## 📊 API Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "_id": "68f598c1ba99dbde41fc5b62",
    "title": "Two Sum",
    "description": "Find two numbers that add up to target",
    "difficulty": "Easy",
    "categories": ["Arrays", "Algorithms"],
    "constraints": [],
    "hints": [],
    "examples": [],
    "testCases": [],
    "createdAt": "2025-10-20T02:04:49.151Z",
    "updatedAt": "2025-10-20T02:04:49.151Z"
  },
  "message": "Question retrieved successfully"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Question not found",
  "error": "Question with ID 123 not found"
}
```

## 🔒 Security Features

### CORS Configuration

Your service is configured to accept requests from:

- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:8080`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`
- `http://127.0.0.1:8080`

### Rate Limiting

- 1000 requests per 15 minutes per IP
- Configurable in the application

### Security Headers

- Helmet.js for security headers
- Input validation and sanitization
- Error handling middleware

## 🚨 Troubleshooting

### Common Issues

**1. Service Not Accessible**

```bash
# Check if containers are running
docker-compose ps

# Check logs
docker-compose logs question-service
docker-compose logs mongo
```

**2. Database Connection Issues**

```bash
# Check MongoDB logs
docker-compose logs mongo

# Test database connection
docker exec -it question-service-mongo-1 mongosh
```

**3. Port Already in Use**

```bash
# Stop existing containers
docker-compose down

# Remove containers and restart
docker-compose down --volumes
docker-compose up --build
```

### Health Checks

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test API endpoint
curl http://localhost:3001/api/questions

# Test from external machine
curl http://10.249.19.34:3001/health
```

## 📝 Development vs Production

### Development

```bash
# Run with live reload
npm run dev

# Run tests
npm test
```

### Production (Docker)

```bash
# Build and run production containers
docker-compose up --build -d

# View logs
docker-compose logs -f
```

## 🔄 Deployment Commands

### Start Services

```bash
# Start all services
docker-compose up -d

# Start with rebuild
docker-compose up --build -d
```

### Stop Services

```bash
# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down --volumes
```

### Update Services

```bash
# Pull latest images and restart
docker-compose pull
docker-compose up -d
```

## 📞 Support Information

### Service Details

- **Service Name**: Question Service
- **Version**: 1.0.0
- **Port**: 3001
- **Database**: MongoDB 7.0
- **Node.js**: v20.19.5

### Contact

- **Team**: G20
- **Repository**: PeerPrep Question Service
- **Documentation**: This guide

---

## 🎯 Quick Reference

**Start Service**: `docker-compose up --build -d`
**Stop Service**: `docker-compose down`
**Health Check**: `curl http://10.249.19.34:3001/health`
**API Base**: `http://10.249.19.34:3001/api/questions`
**Your IP**: `10.249.19.34`

**For other services to connect**: Use HTTP requests to `http://10.249.19.34:3001/api/questions`
