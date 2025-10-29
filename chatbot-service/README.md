# Chatbot Service - AI Chatbot Microservice

A microservice for AI-powered chatbot functionality in PeerPrep.

## Features

- 🤖 AI-powered chatbot using OpenAI
- 💬 Multi-mode support (coding, explanation, hint, general)
- 📝 Conversation history management
- 🔄 Context-aware conversations
- ⚡ Fast response times
- 🛡️ Input validation and error handling
- 📊 Performance monitoring

## API Endpoints

### Send Message

```
POST /api/chatbot/chat
```

**Request Body:**

```json
{
  "message": "How do I implement binary search?",
  "conversationId": "optional-uuid",
  "mode": "coding",
  "context": {
    "questionId": "123",
    "difficulty": "Medium"
  }
}
```

### Get Conversation

```
GET /api/chatbot/conversation/:conversationId
```

### Delete Conversation

```
DELETE /api/chatbot/conversation/:conversationId
```

### Get All Conversations

```
GET /api/chatbot/conversations
```

### Clear All Conversations

```
DELETE /api/chatbot/conversations
```

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Update the OpenAI API key in `.env`:

```
OPENAI_API_KEY=your_actual_api_key_here
```

## Running the Service

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## Usage from Other Services

```javascript
// Example: Call from another microservice
const response = await fetch("http://localhost:3002/api/chatbot/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: "Explain this algorithm",
    mode: "explanation",
    context: {
      code: "your code here",
    },
  }),
});

const data = await response.json();
```

## Health Check

```bash
curl http://localhost:3002/health
```

