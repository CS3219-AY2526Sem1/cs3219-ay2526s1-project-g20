# Question Service Troubleshooting Guide

## Common Issues When Starting the Question Service

### 1. **Missing Dependencies**
**Error:** `Cannot find module 'express'` or similar module errors

**Solution:**
```bash
cd question-service
npm install
```

### 2. **TypeScript Not Compiled**
**Error:** `Cannot find module './dist/index.js'` or `ENOENT: no such file or directory`

**Solution:**
```bash
cd question-service
npm run build
```

The service requires the TypeScript code to be compiled to JavaScript in the `dist/` folder before running.

### 3. **Missing Environment Variables**
**Error:** `MongoServerError: connect ECONNREFUSED` or database connection errors

**Solution:**
Create a `.env` file in the `question-service` directory:
```bash
cd question-service
cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/peerprep-questions
PORT=3001
NODE_ENV=development
EOF
```

Or set environment variables directly:
```bash
export MONGODB_URI=mongodb://localhost:27017/peerprep-questions
export PORT=3001
export NODE_ENV=development
```

### 4. **MongoDB Not Running**
**Error:** `MongoServerError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution:**
Start MongoDB:
```bash
# Using Docker
docker-compose up -d mongo

# Or if MongoDB is installed locally
brew services start mongodb/brew/mongodb-community
# or
sudo systemctl start mongod
```

### 5. **Port Already in Use**
**Error:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find and kill the process using port 3001
lsof -ti:3001 | xargs kill -9

# Or use a different port
export PORT=3002
npm start
```

### 6. **Missing dist/ Folder (Production Mode)**
**Error:** When running `npm start`, it looks for `dist/index.js`

**Solution:**
```bash
npm run build
npm start
```

### 7. **Python Not Installed (For Code Execution)**
**Error:** Code execution fails, but service still starts

**Note:** Python 3 is only needed for code execution feature. The service will start without it, but code execution won't work.

**Solution (if needed):**
```bash
# macOS
brew install python3

# Linux
sudo apt-get install python3

# Verify
python3 --version
```

### 8. **Docker Issues**
**Error:** Docker build fails or container won't start

**Solution:**
```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up

# Or rebuild just the question service
docker-compose build question-service
docker-compose up question-service
```

## Quick Start Checklist

Run these commands in order:

```bash
# 1. Navigate to question-service directory
cd question-service

# 2. Install dependencies
npm install

# 3. Build TypeScript
npm run build

# 4. Ensure MongoDB is running
# Option A: Using Docker
docker-compose up -d mongo

# Option B: Check if MongoDB is running locally
mongosh --eval "db.adminCommand('ping')"

# 5. Set environment variables (if not using .env file)
export MONGODB_URI=mongodb://localhost:27017/peerprep-questions
export PORT=3001

# 6. Start the service
# Development mode (with auto-reload)
npm run dev

# OR Production mode
npm start
```

## Development vs Production

### Development Mode
```bash
npm run dev
```
- Uses `ts-node` to run TypeScript directly
- Auto-reloads on file changes
- No need to build first

### Production Mode
```bash
npm run build
npm start
```
- Requires `dist/` folder (built from TypeScript)
- Runs compiled JavaScript
- More efficient but requires build step

## Docker Compose (Recommended)

The easiest way to start everything:

```bash
# From the question-service directory
docker-compose up --build

# Or from the root directory
cd ..
docker-compose up --build question-service
```

This will:
- Build the Docker image
- Start MongoDB
- Start the question service
- Handle all dependencies automatically

## Verify Service is Running

```bash
# Check health endpoint
curl http://localhost:3001/health

# Should return:
# {"status":"healthy","database":"connected",...}

# Check if questions are available
curl http://localhost:3001/api/questions
```

## Still Having Issues?

1. **Check logs:**
   ```bash
   # If using Docker
   docker-compose logs question-service
   
   # If running directly
   # Check the console output
   ```

2. **Verify Node.js version:**
   ```bash
   node --version  # Should be 20+
   ```

3. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Check file permissions:**
   ```bash
   ls -la dist/
   # Make sure dist/index.js exists and is readable
   ```

