import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getMyProfile, getPublicUser } from '../clients/userClient.js';
import {
  createRequest, cancelMyRequest, acceptMatch, declineMatch,
  retryRequest, getStatus
} from '../services/matchManager.js';

const r = Router();

// Protect everything under this router
r.use(authMiddleware);

// helper: normalise body (topics always array if provided)
function readBody(req) {
  const b = req.body || {};
  return {
    difficulty: b.difficulty, // may be undefined → defaults kick in inside matchManager
    topics: Array.isArray(b.topics) ? b.topics : (b.topics ? [b.topics] : [])
  };
}

// ---------------- Matching service endpoints ----------------

r.post('/requests', async (req, res) => {
  try {
    const { difficulty, topics } = readBody(req);
    const bearer = req.headers.authorization;
    const result = await createRequest(req.user.id, { difficulty, topics }, bearer);
    return res.json(result);
  } catch (e) {
    console.error('createRequest failed:', e);
    return res.status(500).json({ error: 'Failed to create request' });
  }
});

r.delete('/requests/me', async (req, res) => {
  try {
    await cancelMyRequest(req.user.id);
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Failed to cancel request' });
  }
});

r.get('/status', async (req, res) => {
  try {
    const status = await getStatus(req.user.id);
    return res.json(status);
  } catch {
    return res.status(500).json({ error: 'Failed to get status' });
  }
});

r.post('/accept', async (req, res) => {
  try {
    const { pairId } = req.body || {};
    if (!pairId) return res.status(400).json({ error: 'pairId is required' });
    const bearer = req.headers.authorization;
    const out = await acceptMatch(req.user.id, pairId, bearer);
    return res.json(out);
  } catch {
    return res.status(500).json({ error: 'Failed to accept match' });
  }
});

r.post('/decline', async (req, res) => {
  try {
    const { pairId } = req.body || {};
    if (!pairId) return res.status(400).json({ error: 'pairId is required' });
    const bearer = req.headers.authorization;
    const out = await declineMatch(req.user.id, pairId, bearer);
    return res.json(out);
  } catch {
    return res.status(500).json({ error: 'Failed to decline match' });
  }
});

r.post('/retry', async (req, res) => {
  try {
    const { mode = 'same' } = req.body || {};
    const bearer = req.headers.authorization;
    const out = await retryRequest(req.user.id, mode, bearer);
    return res.json(out);
  } catch {
    return res.status(500).json({ error: 'Failed to retry' });
  }
});

// ---------------- User service helper endpoints ----------------

/** Get my own username/profile via User Service */
// in routes.js
r.get('/me/username', async (req, res) => {
  try {
    const bearer = req.headers.authorization;
    const me = await getMyProfile(bearer);
    res.json({ id: me.id, username: me.username });
  } catch (e) {
    console.error('getMyProfile failed:', {
      base: process.env.USER_SVC_BASE,
      err: e.response?.data || e.message
    });
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});


/** Get another user's public info via User Service */
r.get('/peers/:id/public', async (req, res) => {
  try {
    // If your public endpoint is truly public, bearer is optional; include if required.
    const pub = await getPublicUser(req.params.id, req.headers.authorization);
    res.json(pub);
  } catch {
    res.status(500).json({ error: 'Failed to fetch public user info' });
  }
});

export default r;
