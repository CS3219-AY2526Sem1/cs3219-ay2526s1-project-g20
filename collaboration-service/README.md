# Collaboration Service for PeerPrep

The **Collaboration Service** powers the real-time collaborative coding experience in the PeerPrep platform.  
It enables two matched users to edit the same code simultaneously, synchronizing changes through **WebSockets** and **CRDTs (Conflict-free Replicated Data Types)** using the [Y.js](https://github.com/yjs/yjs) framework.

---

## 1. Overview

When two users are paired by the Matching Service, they receive a `roomId` and JWT token.  
Both clients then connect to this service via WebSocket using the provided token.  
The Collaboration Service verifies the token, assigns users to their room, and manages shared Y.js documents so that edits made by one user are immediately reflected on the other’s screen.

This service **does not use a database**. All state is held in memory while a session is active.  
Once both users leave a room, it is automatically cleaned up.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|--------|-------------|----------|
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Static typing and robust tooling for Node.js |
| **Runtime** | [Node.js](https://nodejs.org/) | JavaScript server environment |
| **WebSocket Library** | [ws](https://github.com/websockets/ws) | Handles bidirectional communication between frontend and backend |
| **Real-time Sync** | [Y.js](https://github.com/yjs/yjs) | CRDT library to synchronize code edits |
| **Authentication** | [jsonwebtoken (JWT)](https://github.com/auth0/node-jsonwebtoken) | Verifies user identity and room permissions |
| **Containerization** | [Docker](https://www.docker.com/) | Consistent deployment across environments |
| **Build Tooling** | [ts-node](https://typestrong.org/ts-node) / `tsc` | TypeScript compilation and live development |

---

## 3. Folder Structure

```
collaboration-service/
├── Dockerfile
├── package.json
├── tsconfig.json
└── src/
    ├── app.ts
    ├── server.ts
    ├── auth/
    │   └── jwt.ts
    ├── crdt/
    │   └── yjsManager.ts
    ├── rooms/
    │   └── roomRegistry.ts
    ├── ws/
    │   ├── websocketServer.ts
    │   ├── connectionContext.ts
    │   └── messageTypes.ts
```

---

## 4. Authentication Flow

1. The Matching Service issues a **JWT** containing `userId`, `roomId`, and expiration.
2. The frontend connects using  
   `wss://<collab-service-url>?token=<JWT>`.
3. The Collaboration Service:
   - verifies token validity and room match;
   - associates socket with user context;
   - allows collaboration once verified.

---

## 5. Real-Time Synchronization

- Each collaboration room holds a shared Y.js document (`Y.Doc`).
- Local edits become Y.js updates and are transmitted over WebSocket.
- The `YjsManager` applies incoming updates and rebroadcasts them.

---

## 6. WebSocket Message Types

| Type | Direction | Description |
|------|------------|-------------|
| `JOIN_ROOM` | Client → Server | Join a collaboration room |
| `JOINED` | Server → Client | Confirmation + participant list |
| `YJS_UPDATE` | Bidirectional | Incremental CRDT update |
| `YJS_SYNC` | Server → Client | Full state sync |
| `LEAVE_ROOM` | Client → Server | User explicitly leaves |
| `LEFT` | Server → Client | A participant left |
| `ERROR` | Server → Client | Error message |

The service also includes a **grace-period reconnect** feature (`RECONNECT_GRACE_MS`) to prevent false “peer left” messages during page refresh.

---

## 7. Environment Variables

| Variable | Default | Description |
|-----------|----------|-------------|
| `PORT` | `8080` | Server port |
| `JWT_SECRET` | — | Secret for verifying tokens |
| `HEARTBEAT_INTERVAL_MS` | `30000` | Heartbeat ping interval |
| `HEARTBEAT_TIMEOUT_MULTIPLIER` | `10` | Max missed heartbeats |
| `RECONNECT_GRACE_MS` | `5000` | Grace period before broadcasting `LEFT` |

---

## 8. Running Locally

```bash
npm install
npm run dev
# or build for production
npm run build
npm start
```

**Docker:**
```bash
docker build -t peerprep-collaboration-service .
docker run -p 8080:8080 peerprep-collaboration-service
```

---

## 9. Integration with Frontend

- Uses **`@monaco-editor/react`** + **Y.js** in the frontend.
- WebSocket example:
  ```js
  const ws = new WebSocket(`${WS_BASE_URL}?token=${authToken}`);
  ws.send(JSON.stringify({ type: "JOIN_ROOM", roomId }));
  ```
- Server broadcasts `YJS_UPDATE` messages for real-time sync.
- When a peer leaves, the other client receives a `LEFT` message to trigger a popup.

---

## 10. Lifecycle & Cleanup

- `RoomRegistry` tracks active WebSocket connections.
- When the last user leaves a room, the Y.js doc and room are deleted.
- Heartbeats monitor connection health.

---

## 11. Design Principles

- **Ephemeral state**: No database, all in-memory.
- **Real-time**: Y.js CRDT synchronization.
- **Secure**: Token-based room access.
- **Resilient**: Graceful reconnects & heartbeat detection.

---

## 12. Maintainers

PeerPrep CS3219 Team G20  
National University of Singapore AY25/26 S1

---

**License:** MIT
