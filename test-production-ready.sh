#!/bin/bash

echo "🧪 Testing Production-Ready Microservices"
echo "=========================================="
echo ""

BASE_QUESTION="http://localhost:3001"
BASE_CHATBOT="http://localhost:3002"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test Question Service
echo "📋 Testing Question Service"
echo "---------------------------"

# Test 1: Health Check
echo -n "Health Check: "
result=$(curl -s "$BASE_QUESTION/health" | jq -r '.success // false')
if [ "$result" = "true" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${RED}❌ FAIL${NC}"
fi

# Test 2: Get All Questions
echo -n "GET /api/questions: "
result=$(curl -s "$BASE_QUESTION/api/questions?limit=5" | jq -r '.success // false')
count=$(curl -s "$BASE_QUESTION/api/questions?limit=5" | jq -r '.pagination.total // 0')
if [ "$result" = "true" ] && [ "$count" -gt "0" ]; then
  echo -e "${GREEN}✅ PASS${NC} (Found $count questions)"
else
  echo -e "${RED}❌ FAIL${NC}"
fi

# Test 3: Get Question by ID
echo -n "GET /api/questions/:id with data: "
question_id=$(curl -s "$BASE_QUESTION/api/questions?limit=1" | jq -r '.data[0]._id // empty')
if [ ! -z "$question_id" ]; then
  result=$(curl -s "$BASE_QUESTION/api/questions/$question_id" | jq -r '.success // false')
  has_data=$(curl -s "$BASE_QUESTION/api/questions/$question_id" | jq -r '.data != null')
  if [ "$result" = "true" ] && [ "$has_data" = "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
  else
    echo -e "${RED}❌ FAIL${NC}"
  fi
else
  echo -e "${YELLOW}SKIP (No questions)${NC}"
fi

# Test 4: Create Question
echo -n "POST /api/questions: "
result=$(curl -s -X POST "$BASE_QUESTION/api/questions" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Production Test Question",
    "description": "Testing production readiness",
    "categories": ["Arrays"],
    "difficulty": "Easy",
    "testCases": [{"input": "[1,2,3]", "expectedOutput": "6"}]
  }' | jq -r '.success // false')
if [ "$result" = "true" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${RED}❌ FAIL${NC}"
fi

# Test 5: Statistics
echo -n "GET /api/questions/statistics: "
result=$(curl -s "$BASE_QUESTION/api/questions/statistics" | jq -r '.success // false')
has_stats=$(curl -s "$BASE_QUESTION/api/questions/statistics" | jq -r '.data.total != null')
if [ "$result" = "true" ] && [ "$has_stats" = "true" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${RED}❌ FAIL${NC}"
fi

echo ""
echo "🤖 Testing Chatbot Service"
echo "--------------------------"

# Test 1: Health Check
echo -n "Health Check: "
result=$(curl -s "$BASE_CHATBOT/health" 2>/dev/null | jq -r '.success // false')
if [ "$result" = "true" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${RED}❌ FAIL (Service may not be running)${NC}"
fi

# Test 2: Send Message
echo -n "POST /api/chatbot/chat: "
result=$(curl -s -X POST "$BASE_CHATBOT/api/chatbot/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how can you help?",
    "mode": "general"
  }' 2>/dev/null | jq -r '.success // false')
if [ "$result" = "true" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${RED}❌ FAIL${NC}"
fi

# Test 3: Get Conversations
echo -n "GET /api/chatbot/conversations: "
result=$(curl -s "$BASE_CHATBOT/api/chatbot/conversations" 2>/dev/null | jq -r '.success // false')
has_data=$(curl -s "$BASE_CHATBOT/api/chatbot/conversations" 2>/dev/null | jq -r '.data != null')
if [ "$result" = "true" ] && [ "$has_data" = "true" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${RED}❌ FAIL${NC}"
fi

echo ""
echo "=========================================="
echo "✅ Production Readiness Test Complete!"

