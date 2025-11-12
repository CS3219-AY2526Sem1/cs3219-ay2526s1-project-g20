# Quick Start Guide - Question Service

## Step-by-Step Setup

### 1. Pull Latest Code
```bash
cd question-service
git pull origin integration/question-service-with-matching-service
```

### 2. Rebuild Docker Image (Important!)
```bash
docker compose build question-service
```

### 3. Start Services
```bash
docker compose up -d mongo question-service
```

### 4. Wait for Services to Start
```bash
# Check status
docker compose ps

# Wait until both services show "healthy" or "running"
```

### 5. Seed the Database
```bash
# Use the production script (compiled JavaScript, not TypeScript)
docker compose exec question-service node dist/scripts/seedDatabase.js
```

### 6. Add Test Cases to All Questions
```bash
docker compose exec question-service node dist/scripts/addTestCasesToQuestions.js
```

### 7. Verify It's Working
```bash
# Check health
curl http://localhost:3001/health

# Check questions
curl http://localhost:3001/api/questions
```

## All Commands in One Block

Copy and paste this entire block:

```bash
cd question-service
git pull origin integration/question-service-with-matching-service
docker compose build question-service
docker compose up -d mongo question-service
sleep 10  # Wait for services to start
docker compose exec question-service node dist/scripts/seedDatabase.js
docker compose exec question-service node dist/scripts/addTestCasesToQuestions.js
curl http://localhost:3001/health
```

## Troubleshooting

### If seeding fails with "Cannot find module":
- Make sure you rebuilt the Docker image: `docker compose build question-service`
- Make sure you're using `node dist/scripts/...` not `npm run seed`

### If MongoDB connection fails:
- Check MongoDB is running: `docker compose ps mongo`
- Check connection string: `docker compose exec question-service env | grep MONGODB_URI`

### If port 3001 is already in use:
```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9
# Or on Windows PowerShell:
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

## Alternative: Run Locally (Not Docker)

If Docker isn't working, you can run locally:

```bash
cd question-service

# Install dependencies
npm install

# Build TypeScript
npm run build

# Set environment variables
export MONGODB_URI=mongodb://localhost:27017/peerprep-questions
export PORT=3001

# Make sure MongoDB is running locally
# Then start the service
npm run dev
```

