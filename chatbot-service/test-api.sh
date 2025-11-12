#!/bin/bash

echo "🧪 Testing Chatbot Service API"
echo "================================"
echo ""

BASE_URL="http://localhost:3002"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "📊 Test 1: Health Check"
echo "----------------------"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  echo -e "${GREEN}✅ Pass${NC} - Status: $http_code"
  echo "$body" | jq '.success, .message'
else
  echo -e "${RED}❌ Fail${NC} - Status: $http_code"
fi
echo ""

# Test 2: Send a chat message
echo "💬 Test 2: Send Chat Message (Coding Mode)"
echo "-------------------------------------------"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/chatbot/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is a binary search?",
    "mode": "coding"
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  echo -e "${GREEN}✅ Pass${NC} - Status: $http_code"
  echo "$body" | jq '.success, .data.conversationId, .data.response'
  
  # Extract conversation ID for later tests
  CONV_ID=$(echo "$body" | jq -r '.data.conversationId')
else
  echo -e "${RED}❌ Fail${NC} - Status: $http_code"
fi
echo ""

# Test 3: Get All Conversations
echo "📋 Test 3: Get All Conversations"
echo "----------------------------------"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/chatbot/conversations")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  echo -e "${GREEN}✅ Pass${NC} - Status: $http_code"
  count=$(echo "$body" | jq '.count')
  echo "Total conversations: $count"
else
  echo -e "${RED}❌ Fail${NC} - Status: $http_code"
fi
echo ""

# Test 4: Get Specific Conversation
if [ ! -z "$CONV_ID" ]; then
  echo "🔍 Test 4: Get Conversation by ID"
  echo "----------------------------------"
  response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/chatbot/conversation/$CONV_ID")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✅ Pass${NC} - Status: $http_code"
    echo "$body" | jq '.data.id, (.data.messages | length)'
  else
    echo -e "${RED}❌ Fail${NC} - Status: $http_code"
  fi
  echo ""
fi

# Test 5: Send another message in the same conversation
if [ ! -z "$CONV_ID" ]; then
  echo "💬 Test 5: Continue Conversation"
  echo "-------------------------------"
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/chatbot/chat" \
    -H "Content-Type: application/json" \
    -d "{
      \"message\": \"Can you give me an example?\",
      \"conversationId\": \"$CONV_ID\",
      \"mode\": \"coding\"
    }")
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✅ Pass${NC} - Status: $http_code"
    echo "$body" | jq '.data.conversationId, .data.response'
  else
    echo -e "${RED}❌ Fail${NC} - Status: $http_code"
  fi
  echo ""
fi

# Test 6: Test different modes
echo "🎯 Test 6: Test Different Modes"
echo "-------------------------------"
for mode in "explanation" "hint" "general"; do
  echo "Testing mode: $mode"
  response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/chatbot/chat" \
    -H "Content-Type: application/json" \
    -d "{
      \"message\": \"Test $mode mode\",
      \"mode\": \"$mode\"
    }")
  
  http_code=$(echo "$response" | tail -n1)
  
  if [ "$http_code" -eq 200 ]; then
    echo -e "  ${GREEN}✅ $mode mode works${NC}"
  else
    echo -e "  ${RED}❌ $mode mode failed${NC}"
  fi
done
echo ""

# Test 7: Validation Test (should fail)
echo "🛡️  Test 7: Input Validation (should fail)"
echo "------------------------------------------"
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/chatbot/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "",
    "mode": "coding"
  }')

http_code=$(echo "$response" | tail -n1)

if [ "$http_code" -eq 400 ]; then
  echo -e "${GREEN}✅ Pass${NC} - Validation correctly rejected empty message (Status: $http_code)"
else
  echo -e "${YELLOW}⚠️  Unexpected${NC} - Expected 400, got $http_code"
fi
echo ""

# Test 8: Metrics endpoint
echo "📈 Test 8: Metrics Endpoint"
echo "----------------------------"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/metrics")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
  echo -e "${GREEN}✅ Pass${NC} - Status: $http_code"
  echo "$body" | jq '.success, .data.uptime'
else
  echo -e "${RED}❌ Fail${NC} - Status: $http_code"
fi
echo ""

echo "================================"
echo "🎉 Testing Complete!"
echo ""

