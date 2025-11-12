import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';

import {
  createRequest, acceptMatch, declineMatch,
  retryRequest, getStatus, cancelMyRequest, startSweeper
} from './services/matchManager.js';
import { authMiddleware } from './middleware/auth.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/health', (_, res) => res.json({ ok: true, service: 'matching' }));

// Mount the secured router at /match (routes.js already applies authMiddleware)
app.use('/match', routes);

// All /match routes require auth
app.post('/match/requests', authMiddleware, async (req, res) => {
  const { difficulty, topics = [] } = req.body || {};
  const bearer = req.headers.authorization;
  const out = await createRequest(req.user.id, { difficulty, topics }, bearer);
  res.json(out);
});

app.post('/match/accept', authMiddleware, async (req, res) => {
  const { pairId } = req.body || {};
  if (!pairId) return res.status(400).json({ error: 'pairId required' });
  const bearer = req.headers.authorization;
  const out = await acceptMatch(req.user.id, pairId, bearer);
  res.json(out);
});

app.post('/match/decline', authMiddleware, async (req, res) => {
  const { pairId } = req.body || {};
  if (!pairId) return res.status(400).json({ error: 'pairId required' });
  const bearer = req.headers.authorization;
  const out = await declineMatch(req.user.id, pairId, bearer);
  res.json(out);
});

app.post('/match/retry', authMiddleware, async (req, res) => {
  const { mode = 'same' } = req.body || {};
  const bearer = req.headers.authorization;
  const out = await retryRequest(req.user.id, mode, bearer);
  res.json(out);
});

app.get('/match/status', authMiddleware, async (req, res) => {
  const out = await getStatus(req.user.id);
  res.json(out);
});

app.post('/match/cancel', authMiddleware, async (req, res) => {
  await cancelMyRequest(req.user.id);
  res.json({ ok: true });
});

// Start sweeper + server
const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`Matching Service running on :${PORT}`);
  startSweeper();
});
