# Chatbot Service - API Integration Guide

## 🚀 Quick Start

The Chatbot Service provides AI-powered chatbot functionality that other microservices can call via REST API.

## 📍 Service Information

- **Service URL**: `http://localhost:3002` (or `http://10.249.19.34:3002`)
- **Health Check**: `http://localhost:3002/health`
- **Base API**: `http://localhost:3002/api/chatbot`

## 🔗 Available Endpoints

### 1. Send Message to Chatbot

**Endpoint**: `POST /api/chatbot/chat`

**Description**: Send a message to the AI chatbot and receive a response.

**Request Body**:

```json
{
  "message": "How do I implement binary search in Python?",
  "conversationId": "optional-uuid-here",
  "mode": "coding",
  "context": {
    "questionId": "123",
    "difficulty": "Medium",
    "category": "Algorithms"
  }
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "response": "Here's how to implement binary search...",
    "conversationId": "fea98383-878b-43fb-90aa-27f2f7606b33",
    "timestamp": "2025-10-26T04:04:12.689Z",
    "usage": {
      "promptTokens": 100,
      "completionTokens": 50,
      "totalTokens": 150
    }
  }
}
```

**Example Usage** (JavaScript):

```javascript
const response = await fetch("http://localhost:3002/api/chatbot/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: "Explain merge sort",
    mode: "explanation",
    context: {
      difficulty: "Medium",
    },
  }),
});

const data = await response.json();
console.log(data.data.response);
```

**Example Usage** (Python):

```python
import requests

response = requests.post(
    'http://localhost:3002/api/chatbot/chat',
    json={
        'message': 'Explain merge sort',
        'mode': 'explanation',
        'context': {
            'difficulty': 'Medium'
        }
    }
)

data = response.json()
print(data['data']['response'])
```

### 2. Get Conversation History

**Endpoint**: `GET /api/chatbot/conversation/:conversationId`

**Description**: Retrieve the full conversation history.

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "fea98383-878b-43fb-90aa-27f2f7606b33",
    "messages": [
      {
        "role": "user",
        "content": "Hello",
        "timestamp": "2025-10-26T04:04:00.000Z"
      },
      {
        "role": "assistant",
        "content": "Hi! How can I help you?",
        "timestamp": "2025-10-26T04:04:02.000Z"
      }
    ],
    "createdAt": "2025-10-26T04:04:00.000Z",
    "updatedAt": "2025-10-26T04:04:02.000Z"
  }
}
```

### 3. Delete Conversation

**Endpoint**: `DELETE /api/chatbot/conversation/:conversationId`

**Description**: Delete a conversation from history.

**Response**:

```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

### 4. Get All Conversations

**Endpoint**: `GET /api/chatbot/conversations`

**Description**: Get list of all conversations.

### 5. Clear All Conversations

**Endpoint**: `DELETE /api/chatbot/conversations`

**Description**: Delete all conversation history.

## 🎯 Chatbot Modes

The chatbot supports different modes for different use cases:

- **`coding`**: Help with coding problems and solutions
- **`explanation`**: Explain concepts and algorithms
- **`hint`**: Provide hints without giving away solutions
- **`general`**: General purpose chatbot (default)

## 💡 Integration Examples

### Example 1: Question Service Integration

```javascript
// In your question service controller
async function getQuestionWithHints(questionId) {
  // Get question from database
  const question = await Question.findById(questionId);

  // Call chatbot for hints
  const chatResponse = await fetch("http://localhost:3002/api/chatbot/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Give me a hint for this problem: ${question.title}`,
      mode: "hint",
      context: {
        questionId: questionId,
        difficulty: question.difficulty,
        category: question.categories[0],
      },
    }),
  });

  const chatData = await chatResponse.json();

  return {
    question,
    hint: chatData.data.response,
    conversationId: chatData.data.conversationId,
  };
}
```

### Example 2: User Service Integration

```javascript
// Track user conversations
async function saveUserConversation(userId, conversationId) {
  await User.findByIdAndUpdate(userId, {
    $push: { conversations: conversationId },
  });
}

// Get user's conversation history
async function getUserConversations(userId) {
  const user = await User.findById(userId);
  const conversations = await Promise.all(
    user.conversations.map((convId) =>
      fetch(`http://localhost:3002/api/chatbot/conversation/${convId}`).then(
        (r) => r.json()
      )
    )
  );
  return conversations;
}
```

### Example 3: Real-time Chat

```javascript
// WebSocket or SSE integration
socket.on("user_message", async (message, conversationId) => {
  const response = await fetch("http://localhost:3002/api/chatbot/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      conversationId,
      mode: "coding",
    }),
  });

  const data = await response.json();
  socket.emit("bot_response", data.data);
});
```

## 🔄 Conversation Flow

1. **First Message**: Don't provide `conversationId`

   ```json
   {
     "message": "Hello",
     "mode": "coding"
   }
   ```

   Service returns a new `conversationId`

2. **Follow-up Messages**: Use the `conversationId` to continue conversation
   ```json
   {
     "message": "Can you explain that more?",
     "conversationId": "fea98383-878b-43fb-90aa-27f2f7606b33",
     "mode": "coding"
   }
   ```

## 🛡️ Error Handling

```javascript
try {
  const response = await fetch("http://localhost:3002/api/chatbot/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Hello" }),
  });

  if (!response.ok) {
    throw new Error(`Chatbot service error: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
} catch (error) {
  console.error("Chatbot service unavailable:", error);
  // Fallback behavior
  return { response: "Chatbot temporarily unavailable" };
}
```

## 📊 Rate Limiting

- 1000 requests per 15 minutes per IP
- Consider implementing retry logic with exponential backoff

## 🔐 Security

- The service currently has no authentication (for development)
- In production, implement API gateway or authentication middleware
- Rate limiting protects against abuse

## 🧪 Testing

```bash
# Test health
curl http://localhost:3002/health

# Test chat
curl -X POST http://localhost:3002/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

## 🚀 For Other Services

Your service can call the chatbot service at:

- **Local**: `http://localhost:3002/api/chatbot/chat`
- **Network**: `http://10.249.19.34:3002/api/chatbot/chat`

Replace with your actual IP address when deploying.


