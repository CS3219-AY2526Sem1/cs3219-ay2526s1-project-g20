# Seeding Database in Docker Container

## Problem
The Docker container only contains compiled JavaScript files in the `dist/` folder, not TypeScript source files. Therefore, you cannot use `ts-node` commands inside the container.

## Solution

### Option 1: Use Production Scripts (Recommended)

After the container is built and running, use the production scripts that run the compiled JavaScript:

```bash
# Seed with sample questions
docker compose exec question-service node dist/scripts/seedDatabase.js

# OR using npm script (if package.json has the :prod scripts)
docker compose exec question-service npm run seed:prod

# Add test cases to all questions
docker compose exec question-service node dist/scripts/addTestCasesToQuestions.js

# OR
docker compose exec question-service npm run add-test-cases:prod
```

### Option 2: Seed from Outside Container

Run the seed script on your local machine (requires Node.js and MongoDB connection):

```bash
# Make sure MongoDB is accessible from your machine
# Update MONGODB_URI if needed (e.g., mongodb://localhost:27017/peerprep-questions)

cd question-service
npm install
npm run build
export MONGODB_URI=mongodb://localhost:27017/peerprep-questions
npm run seed
```

### Option 3: Use API to Add Questions

You can also add questions via the API:

```bash
# Get the service URL
SERVICE_URL=http://localhost:3001

# Add questions via API (if you have a questions JSON file)
curl -X POST $SERVICE_URL/api/questions \
  -H "Content-Type: application/json" \
  -d @sample-questions.json
```

## Quick Start

1. **Start the services:**
   ```bash
   docker compose up -d
   ```

2. **Wait for services to be healthy:**
   ```bash
   docker compose ps
   ```

3. **Seed the database:**
   ```bash
   docker compose exec question-service node dist/scripts/seedDatabase.js
   ```

4. **Add test cases to all questions:**
   ```bash
   docker compose exec question-service node dist/scripts/addTestCasesToQuestions.js
   ```

5. **Verify:**
   ```bash
   curl http://localhost:3001/api/questions
   ```

## Troubleshooting

### Error: Cannot find module './seedDatabase.ts'
**Cause:** Trying to use `ts-node` in production container  
**Solution:** Use `node dist/scripts/seedDatabase.js` instead

### Error: Cannot find module '../../sample-questions.json'
**Cause:** `sample-questions.json` not copied to Docker image  
**Solution:** Rebuild the Docker image after the fix:
```bash
docker compose build question-service
docker compose up -d question-service
```

### Error: Connection refused to MongoDB
**Cause:** MongoDB container not running or wrong connection string  
**Solution:** 
```bash
# Check MongoDB is running
docker compose ps mongo

# Check connection string in container
docker compose exec question-service env | grep MONGODB_URI
```

