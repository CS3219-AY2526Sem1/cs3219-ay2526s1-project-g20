# PeerPrep – M2 Matching Service

A minimal matching microservice that pairs two users for coding practice based on **difficulty** and **topic**. Built with **Node.js (Express)**, **Redis**, and **Docker**.

- 🚦 **Criteria**: The list of topics and difficulties is retrieved at runtime from the **Question Service**
- 🪣 **Buckets model**: users are queued in FIFO “buckets” keyed by `(difficulty, topic)`
- 🤝 **Handshake**: once paired, both must accept within a time window
- 🧹 **Sweeper**: background job expires stale queue items and timed-out handshakes
- 🔐 **Identity:** JWT `sub` (userId) from **User Service** is the canonical identifier.

---

## Table of Contents

- [High-level idea](#high-level-idea)
- [How the algorithm works (simple)](#how-the-algorithm-works-simple)
- [What lives in Redis](#what-lives-in-redis)
- [Features and FR/NFR mapping](#features-and-frnfr-mapping)
- [API Endpoints](#api-endpoints)
- [Repository layout](#repository-layout)
- [Environment variables](#environment-variables)
- [Run locally (no Docker)](#run-locally-no-docker)
- [Run with Docker](#run-with-docker)
- [Quick demo with curl (includes Alice/Bob example)](#quick-demo-with-curl-includes-alicebob-example)
- [Timeouts, Decline, Retry (broaden)](#timeouts-decline-retry-broaden)
- [Troubleshooting](#troubleshooting)
- [Future improvements](#future-improvements)

---

## High-level idea

We model matching as many small **FIFO queues** (“buckets”). There is one bucket for each combination of **difficulty** and **topic** (e.g., `Q:Easy:AI`, `Q:Medium:Trees`, etc.).

When a user clicks **Find match**:

1. We **enqueue** them into **every bucket** their criteria cover.
   - Only difficulty → all topics for that difficulty.
   - Only topics → all difficulties for those topics.
   - Both → Cartesian product `difficulty × topics`.
2. We **peek** at those buckets to see if someone compatible is already waiting.
3. If yes, we **pair** them and move both to a **handshake** state (both must accept).
4. If no, we leave them queued until they get matched, **decline**, **retry**, or **expire**.

---

## How the algorithm works

### Matching buckets
- Each `(difficulty, topic)` is a queue.
- If user selects `Easy + [AI]`, they go into queue `Q:Easy:AI`.
- If they select `Easy` but **no** topic, they go into `Q:Easy:*` (all topics).
- If they select a **topic** but **no** difficulty, they go into `Q:*:<topic>` (all diffs).
- If both are selected, they enter the **cross product** (e.g., `Easy+AI`, `Easy+Trees`, …).

### FIFO & fairness
- Buckets are FIFO lists in Redis (`RPUSH` / `LPOP` semantics).
- We store for each user a `seniorityTs` to preserve fairness if they are re-queued.

### Race safety
- Two servers could try to match the same two users at the same time.
- We avoid duplicates with a **Redis lock** (`SET NX EX`) on the pair `(A,B)`.

### Handshake
- Once paired, both users must **accept** within `ACCEPT_WINDOW_SECS`.
- If both accept → create a collab session and mark both `SESSION_READY`.
- If one declines or time runs out → we **requeue** the other and end the pair.

### Sweeper
- A periodic task that:
  - Expires queued requests that waited longer than `TTL_SECS` (NFR1.1).
  - Expires handshakes whose window ended (and requeues as per policy).

### Cleanup and Safety
- When a match forms, both users are removed from all buckets they joined (not just the matched one).
- This prevents duplicate or “ghost” matches if they appear in multiple queues.
- Cleanup uses a Redis lock (LOCK:cleanup:<userId>) to avoid race conditions when multiple servers process users simultaneously.
- Removal happens before new requests are added, ensuring clean state and consistent matching fairness.

---

## What lives in Redis

We keep data very simple (strings, lists, sets, hashes):

- `Q:<diff>:<topic>` – **LIST**: FIFO queue of usernames for that bucket  
- `UB:<username>` – **SET**: all bucket keys the user was inserted into (for fast cleanup)  
- `R:<username>` – **HASH**: request state: `status`, `createdAt`, `seniorityTs`, `difficulty`, `topics`, `pairId`, `expiresAt`, `sessionId`  
- `PAIR:<pairId>` – **HASH**: pair record: `u1`, `u2`, `aAccepted`, `bAccepted`, `expiresAt`  
- `IDX:ACTIVE_USERS` – **SET**: usernames currently queued/active (sweeper scans this)  
- `IDX:ACTIVE_PAIRS` – **SET**: pending pair IDs (sweeper scans this)

---

## Features and FR/NFR mapping

### FR (Functional Requirements)

- **F1**: Matching via criteria → buckets & `/match/requests`.
- **F1.1**: Criteria are difficulty + topics (choose **1–3** categories total).
- **F1.1.1**: Must choose ≥1 and ≤3 total (difficulty counts as 1; each topic counts as 1).
- **F1.1.2**: No invalid criteria (validated against allowed lists).
- **F1.1.3**: No default criteria → selecting none means “include all” for that axis.
- **F1.2**: Timeouts if no match → sweeper sets `EXPIRED`.
- **F1.2.1**: Timeout notification → placeholder (websocket TODO).
- **F1.2.2**: Both users must accept within a window → handshake + sweeper.
- **F1.2.3**: Retry with relaxed criteria → `/match/retry` with `mode=broaden`.
- **F1.3**: Fair & efficient queues → FIFO buckets + `seniorityTs`.
  - **F1.3.1**: Priority queue → FIFO per bucket.
  - **F1.3.2**: Fairness for less-popular topics → (low priority; can extend later).

### NFR (Non-Functional Requirements)

- **NFR1**: Resilient queue management & recovery → sweeper requeues or expires appropriately.
  - **NFR1.1**: No request stuck beyond timeout → TTL enforced by sweeper.
  - **NFR1.2**: ≥70% disconnection handling → automatic requeue/expiry flow.
- **NFR2**: Support ≥100 concurrent match requests → Redis lists & simple ops, horizontally scalable.
  - **NFR2.1**: Horizontal scale → race-free matching via Redis locks.
  - **NFR2.2**: Bursts → O(1) per bucket push/pop.

---

---

## API Endpoints

> All endpoints require `Authorization: Bearer <JWT>` with a `username` claim.

### `GET /health`
Returns basic service info.

```json
{ "ok": true, "service": "matching" }
```

---

### `POST /match/requests`

Creates a new match request for the user.

**Body:**
```json
{
  "difficulty": "Easy|Medium|Hard",
  "topics": ["AI", "Trees"]
}
```

**Rules:**
- Must select **between 1 and 3 total “categories.”**  
  (Difficulty counts as 1; each topic counts as 1.)
- If a dimension is omitted, defaults to **all** values for that dimension.

**Returns:**
```json
{ "ok": true }
```
or
```json
{ "error": "Please select between 1 and 3 categories in total." }
```

> 🧩 **Question Service Integration**  
> - The Matching Service fetches the canonical list of topics and difficulties from the **Question Service** automatically.  
> - When users create a request, their chosen `difficulty` and `topics` are validated against these lists.  
> - Stored fields (`difficulty`, `topics`) can be read later via `/match/status` to request or display corresponding questions.

---

### `GET /match/status`

Fetches the user’s current matching status.

**Example response:**
```json
{
  "status": "PENDING_ACCEPT",
  "createdAt": "1760581687814",
  "difficulty": "Easy",
  "topics": "[\"AI\"]",
  "pairId": "alice__bob__1760581692169",
  "expiresAt": "1760581752169"
}
```

If the user has no active request:
```json
{ "status": "NONE" }
```

> 🧭 **Used by Question & Collaboration Services**  
> - **Question Service:** can read `difficulty` and `topics` to recommend or assign relevant questions for the pair.  
> - **Collaboration Service:** can read `pairId` and later `sessionId` once created to fetch session context.

---

### `POST /match/accept`

Marks the user as having accepted a pending match.

**Body:**
```json
{ "pairId": "alice__bob__1760581692169" }
```

**Returns:**
```json
{ "ok": true }
```
or
```json
{ "error": "Pair not found" }
```
> 🤝 Collaboration Service Integration
> - Rooms are created on-demand when the first client joins the WebSocket.
> - After both users accept, the Matching Service publishes a `sessionId` (room id) via `/match/status`.
> - Each client opens a WebSocket to the Collaboration Service using that `sessionId`:
>   `ws://<collab-host>:8084/ws?room=<sessionId>`.
> - Authentication is via the user’s JWT (HS256 in dev, RS256 in prod). If configured with
>   `AUTH_REQUIRE_ROOM_CLAIM=true`, the token must also include `"room": "<sessionId>"`.
> - We do not parse `pairId` or `userId`; it is internal to Matching. Participants are inferred from each client’s JWT (`sub`).
>   ```json
>   {
>     "status": "SESSION_READY",
>     "sessionId": "collab_9f12a38e"
>   }
>   ```

---

### `POST /match/decline`

Declines a match. The other user is requeued automatically.

**Body:**
```json
{ "pairId": "alice__bob__1760581692169" }
```

**Returns:**
```json
{ "ok": true }
```

> - When a user declines, their partner is **requeued automatically** using their stored difficulty/topics.  
> - Collaboration Service does **not** get triggered unless both users accept.

---

### `POST /match/retry`

Requeues a request after expiry or failure.

**Body:**
```json
{ "mode": "same" }
```
or
```json
{ "mode": "broaden" }
```

- `"same"` → Re-enqueues with the same criteria  
- `"broaden"` → Relaxes **difficulty only** (topics remain fixed)

**Returns:**
```json
{
  "ok": true,
  "mode": "broaden",
  "applied": {
    "difficulty": "Medium",
    "topics": ["AI", "Graphs"]
  }
}
```

> 🔁 **Note:** Topic relaxation has been removed — only difficulty is broadened.  
> This aligns with Question Service’s canonical topic list.

---

### `POST /match/cancel`

Cancels any existing match request.  
Removes user from all buckets and clears their request record.

**Returns:**
```json
{ "ok": true }
```

---

### 🔍 Summary of Service Integrations

| Service | Consumes / Affected Endpoint | Data Shared or Exposed | Purpose |
|----------|-----------------------------|------------------------|----------|
| **User Service** | `/match/me/username` | `id`, `username` | Auth & profile verification |
| **Question Service** | `/match/status` | `difficulty`, `topics[]` | Fetch or assign relevant question |
| **Collaboration Service** | `/match/accept` + `/match/status` | `userId[]`, `pairId`, `sessionId` | Create and manage live coding sessions |

---

## Repository layout

```
matching-service/
├─ src/
│  ├─ server.js                  # Express bootstrap, mounts /match, starts sweeper
│  │
│  ├─ routes/
│  │  └─ index.js                # All HTTP routes (protected by auth middleware)
│  │
│  ├─ middleware/
│  │  └─ auth.js                 # JWT verification middleware; sets req.user
│  │
│  ├─ services/
│  │  ├─ matchManager.js         # Core matching logic (queues, pairing, sweeper)
│  │  └─ collabClient.js         # Stub to create collaboration sessions after a match
│  │
│  ├─ clients/
│  │  ├─ userClient.js           # Communicates with User Service (/profile, /public)
│  │  └─ questionClient.js       # Retrieves canonical topics & difficulties from Question Service
│  │
│  ├─ dev/
│  │  ├─ makeDevToken.js         # Utility script to generate local HS256 test tokens
│  │  │
│  │  ├─ mock/                   # Local mock services for isolated testing
│  │  │  ├─ mockUserService.js
│  │  │  └─ mockQuestionService.js
│  │  │
│  │  └─ test/                   # Integration & workflow test scripts
│  │     ├─ testMatching.js
│  │     └─ testUserEndpoint.js
│  │
│  └─ (optional future folders)  # e.g., utils/, config/, etc.
│
├─ .env                          # Local environment configuration
├─ .env.example                  # Example environment file for setup reference
├─ .dockerignore                 # Ignore rules for Docker build context
├─ Dockerfile                    # Multi-stage build (Node 20 Alpine)
├─ package.json                  # Node project manifest
├─ package-lock.json             # Dependency lock file
├─ .gitignore                    # Git ignore rules
└─ README.md                     # Project documentation (this file)
```

---

## Environment variables

Create a `.env` file (keep secrets out of Git):

```env
PORT=3001
NODE_ENV=production
JWT_SECRET=devsecret

# Redis connection
REDIS_URL=redis://host.docker.internal:6379  # For macOS/Windows
# Or use redis://redis:6379 if using docker-compose with a 'redis' service

# Timeouts
TTL_SECS=120
SWEEPER_INTERVAL_SECS=5
ACCEPT_WINDOW_SECS=25

# Allowed topics
TOPICS=AI,Cybersecurity,Trees,Graphs,DP

# Question service
QUESTIONS_SVC_BASE=http://question-service:3001
QS_CACHE_TTL_MS=300000

# User service
USERS_SVC_BASE=http://user-service:8000
```

---

## Run locally (no Docker)

1️⃣ **Install dependencies**
```bash
npm ci
```

2️⃣ **Start Redis**
```bash
npm ci
# macOS (Homebrew)
brew install redis
brew services start redis

# or via Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

3️⃣ **Start the service**
```bash
node src/server.js
# Output: Matching Service running on :3001
```

---

## Run with Docker

```bash
docker build -t peerprep-matching:dev .
docker run --rm -p 3001:3001 --env-file .env peerprep-matching:dev
```

> 💡 Use `-d` to run in background:  
> `docker run -d ...`  
> View logs with:
```bash
docker logs -f matching
```

**Stop it later:**
```bash
docker stop matching
```

---

## Quick demo with curl (includes Alice/Bob example)

### 0️⃣ Health check
```bash
curl http://localhost:3001/health
# {"ok":true,"service":"matching"}
```

---

### 1️⃣ Generate JWTs inside container
```bash
ALICE=$(docker exec matching node -e "console.log(require('jsonwebtoken').sign({username:'alice'}, process.env.JWT_SECRET || 'devsecret', {expiresIn:'1h'}))")
BOB=$(docker exec matching node -e "console.log(require('jsonwebtoken').sign({username:'bob'}, process.env.JWT_SECRET || 'devsecret', {expiresIn:'1h'}))")
```

---

### 2️⃣ Both users join
```bash
curl -X POST http://localhost:3001/match/requests \
  -H "Authorization: Bearer $ALICE" \
  -H "Content-Type: application/json" \
  -d '{"difficulty":"Easy","topics":["AI"]}'

curl -X POST http://localhost:3001/match/requests \
  -H "Authorization: Bearer $BOB" \
  -H "Content-Type: application/json" \
  -d '{"difficulty":"Easy","topics":["AI"]}'
```

---

### 3️⃣ Check Alice’s status
```bash
curl -H "Authorization: Bearer $ALICE" http://localhost:3001/match/status
# Example:
# {"status":"PENDING_ACCEPT", "pairId":"alice__bob__1760581692169", "expiresAt":"..."}
```

---

### 4️⃣ Accept match from both
```bash
PAIR=alice__bob__1760581692169

curl -X POST http://localhost:3001/match/accept \
  -H "Authorization: Bearer $ALICE" \
  -H "Content-Type: application/json" \
  -d "{\"pairId\":\"$PAIR\"}"

curl -X POST http://localhost:3001/match/accept \
  -H "Authorization: Bearer $BOB" \
  -H "Content-Type: application/json" \
  -d "{\"pairId\":\"$PAIR\"}"
```

---

### 5️⃣ Verify session created
```bash
curl -H "Authorization: Bearer $ALICE" http://localhost:3001/match/status
# {"status":"SESSION_READY","sessionId":"S_1760581716851",...}
```

> 🕒 If you see `"Pair not found"`, it probably expired — set `ACCEPT_WINDOW_SECS=60` in `.env` and rebuild.

---

## Timeouts, Decline, Retry (broaden)

- **Queue TTL (`TTL_SECS`)**  
  If a user waits too long without matching, sweeper marks them as `EXPIRED`.  
  Example UI message: “You’ve been waiting 30s — no matches yet.”

- **Handshake window (`ACCEPT_WINDOW_SECS`)**  
  - If only one accepts → that user is requeued with same criteria.  
  - The other becomes `NONE`.

- **Decline (`POST /match/decline`)**  
  - The other user is requeued automatically.  
  - Decliner becomes `NONE`.

- **Retry (`POST /match/retry`)**  
  - `"same"` → re-enqueues with same criteria.  
  - `"broaden"` → adds sibling topics (max total 3) and widens difficulty ±1.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|----------|---------------|-----|
| `401 Invalid token` | JWT missing/invalid | Generate token signed with `JWT_SECRET` |
| `Pair not found` on accept | Handshake expired | Increase `ACCEPT_WINDOW_SECS` or accept faster |
| No match happening | Buckets mismatch | Ensure users share same `(difficulty, topic)` |
| Docker can’t reach Redis | Wrong Redis URL | Use `redis://host.docker.internal:6379` on Mac/Windows or `redis://redis:6379` in compose |

---

## Future improvements

- Websocket notifications (“Found a match!”, “Expired, tap to retry”)
- Better fairness for less-popular topics (global aging / weighting)
- Logging & metrics (Prometheus / Grafana)
- Integration tests with a Redis test container
- Rate limiting & abuse prevention

---
