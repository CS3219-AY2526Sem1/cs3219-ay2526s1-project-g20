## PeerPrep Monorepo Guide

This document replaces the original course boilerplate and explains how to start, verify, and understand the PeerPrep microservices system.

---

### Services Overview

| Service | Path | Port(s) | Purpose |
|---------|------|---------|---------|
| **frontend** | `frontend/` | `3000` | React UI for problems, matching, code editor, collaboration, and chatbot. |
| **matching-service** | `matching-service/` | `8084` (host) → `3001` (container) | Redis-backed matching engine with relaxed difficulty retry. |
| **question-service** | `question-service/` | `3001` | Node/Express service with MongoDB store for questions and execution. Difficulty ordering is fixed at Easy → Medium → Hard. |
| **chatbot-service** | `chatbot-service/` | `3302` (host) → `3002` (container) | Node/Express wrapper around OpenAI (falls back to mock when key unavailable). |
| **user-service** | `user_service/` | `8000` | FastAPI for registration/login/profile stored in MongoDB. |
| **collaboration-service** | `collaboration-service/` | `8090` | TypeScript WebSocket/Yjs server for live code sharing plus partner chat. |
| **mongo** | docker | `27017` | Question and user data. |
| **redis** | docker | `6379` | Matching queues, sweeper indices. |

---

### Prerequisites

1. Docker Desktop or Docker Engine (with Docker Compose v2).
2. Node.js 18+ with npm for local dev (optional).
3. Python 3.11 and pip (for running user-service outside Docker).
4. OpenAI API key (optional). Without a key, chatbot returns mock responses.

---

### Clone and Sync

```bash
git clone https://github.com/CS3219-AY2526Sem1/cs3219-ay2526s1-project-g20.git
cd cs3219-ay2526s1-project-g20
git fetch origin
git checkout staging
git pull origin staging
```

Copy env template and edit values as needed:

```bash
cp env.example .env
# Fill in OPENAI_API_KEY, etc.
```

Individual services also respect `.env` files in their directories when run manually.

---

### One-Command Startup (Docker)

```bash
docker compose up --build -d
```

This sets up Mongo, Redis, and all application services on the `peerprep-g20_app-network`. Review status:

```bash
docker compose ps
```

All services should be `Up (healthy)`. Sample endpoints:

- Frontend: http://localhost:3000/
- Matching: http://localhost:8084/
- Question API: http://localhost:3001/
- Chatbot API: http://localhost:3302/
- User API: http://localhost:8000/
- Collaboration WS: ws://localhost:8090/ws

Stop everything:

```bash
docker compose down
```

---

### Verification Checklist

1. **Frontend** loads, login/signup works (User service + Mongo).
2. **Problems page** shows questions ordered by `Easy → Medium → Hard` (Question service).
3. **Code execution** in editor works for Python and JavaScript (server-supplied test cases).
4. **Matching**: open two browsers, request a match with overlapping criteria, and accept the match to enter collaboration (Matching service → Collaboration service → Frontend).
5. **Partner chat**: within collaboration, typing `@partner Hello` sends a peer-only message and shows a header alert.
6. **Chatbot**: messages go to OpenAI if valid key; otherwise fallback responses appear.

If anything loops (e.g., repeated matching), inspect logs:

```bash
docker compose logs matching-service
docker compose logs collaboration-service
```

Flush Redis if stale queue entries persist:

```bash
docker compose exec redis redis-cli flushall
```

---

### Running Services Individually

For targeted development, you can run services without Docker. Ensure local MongoDB/Redis if required.

- **Frontend** (dev mode)  
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
- **Matching service**  
  ```bash
  cd matching-service
  npm install
  npm run dev
  ```
  Requires `REDIS_URL` pointing to Redis (`redis://localhost:6379` if running locally).

- **Question service**  
  ```bash
  cd question-service
  npm install
  npm run dev
  ```
  Requires MongoDB (`MONGODB_URI=mongodb://localhost:27017/peerprep-questions`).

- **User service**  
  ```bash
  cd user_service
  pip install -r requirements.txt
  uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```

- **Chatbot service**  
  ```bash
  cd chatbot-service
  npm install
  npm run dev
  ```
  Set `OPENAI_API_KEY` for real responses.

- **Collaboration service**  
  ```bash
  cd collaboration-service
  npm install
  npm run dev
  ```
  Needs the same JWT secret as matching (`COLLAB_JWT_SECRET`, etc.).

---

### Data and Scripts

- Seed questions with test cases using `question-service` scripts:
  ```bash
  docker compose exec question-service npm run seed:prod
  docker compose exec question-service npm run add-test-cases:prod
  ```
  or locally with `npm run seed`.

- Redis stores match queues in-memory; resetting is optional:
  ```bash
  docker compose exec redis redis-cli flushall
  ```

---

### Troubleshooting

- **Black/white text mismatch in chat**: styles live in `frontend/src/css/CodeEditor.css`.
- **OpenAI errors**: check logs for `insufficient_quota`; remove key or update billing.
- **Matching stuck**: ensure both clients accept. Examine `matching-service` logs to confirm status transitions.
- **JWT issues**: tokens issued by matching contain `sub` (userId) and `roomId` claims. Collaboration service uses these to route messages and Yjs updates.

---

### Summary

1. Clone > fetch > pull latest staging.
2. Configure `.env`.
3. `docker compose up --build -d` to run all services.
4. Validate features in the frontend with two browser sessions.
5. Use per-service commands for focused development.
6. Keep question data seeded and Redis clear for reliable matching.

This README replaces the previous course boilerplate and should equip contributors and testers to start the PeerPrep environment end-to-end. Feel free to extend it with further developer notes or onboarding tips.
