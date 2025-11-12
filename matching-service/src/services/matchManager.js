import fs from 'fs';
import Redis from 'ioredis';
import { createSession } from './collabClient.js';
import { getQuestionMeta } from '../clients/questionClient.js';
import { pickQuestionId } from '../clients/questionClient.js';

/**
 * ============================
 * M2 Matching Service (Redis)
 * ============================
 * Key ideas:
 * - We model matching as many FIFO "buckets", one per (difficulty, topic).
 * - A user’s request is enqueued into every relevant bucket.
 * - When another compatible user appears in any shared bucket, we attempt to pair them.
 * - After pairing, both users must accept within a time window (ACCEPT_WIN).
 * - A background sweeper enforces TTL of queued requests and handshake expiry of pairs.
 *
 * Data structures in Redis (all plain strings):
 *   Q:<diff>:<topic>        (LIST)  FIFO queue of userId for that bucket
 *   UB:<userId>             (SET)   All bucket keys this user was inserted into (for cleanup)
 *   R:<userId>              (HASH)  Request state for the user (status, criteria, pairId, timestamps, etc.)
 *   PAIR:<pairId>           (HASH)  Pair record for a pending handshake (u1, u2, aAccepted, bAccepted, expiresAt)
 *   IDX:ACTIVE_USERS        (SET)   UserId with active requests (QUEUED or similar), used by the sweeper
 *   IDX:ACTIVE_PAIRS        (SET)   PairIds that are still pending, used by the sweeper
 */

 // --------- Config & Data ---------

// Redis connection. In Docker, pass REDIS_URL (e.g., redis://redis:6379)
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Time controls:
// - TTL: how long a queued request can sit before expiring (NFR1.1)
// - SWEEP: how often the sweeper runs
// - ACCEPT_WIN: time window for both users to accept a match (F1.2.2)
const TTL = Number(process.env.TTL_SECS || 120);
const SWEEP = Number(process.env.SWEEPER_INTERVAL_SECS || 5);
const ACCEPT_WIN = Number(process.env.ACCEPT_WINDOW_SECS || 25);
const DIFF_ORDER = ['Easy', 'Medium', 'Hard'];
const FALLBACK_DIFFS = [...DIFF_ORDER];
const FALLBACK_TOPICS = ["Algorithms", "Arrays", "Data Structures", "Strings", "Graphs"];

function orderedDifficulties(raw = []) {
  const sanitized = Array.isArray(raw) ? raw.map(x => (x || '').trim()).filter(Boolean) : [];
  const seen = new Set();
  const ordered = [];

  for (const diff of DIFF_ORDER) {
    if (sanitized.includes(diff) && !seen.has(diff)) {
      seen.add(diff);
      ordered.push(diff);
    }
  }

  for (const diff of sanitized) {
    if (!seen.has(diff)) {
      seen.add(diff);
      ordered.push(diff);
    }
  }

  if (!ordered.length) return [...FALLBACK_DIFFS];
  return ordered;
}

// Allowable topics and difficulties
async function getCanonicalLists(bearerToken) {
  try {
    const { difficulties, topics } = await getQuestionMeta(bearerToken);
    const DIFFS = orderedDifficulties(difficulties);
    const ALL_TOPICS = Array.isArray(topics) && topics.length ? topics : FALLBACK_TOPICS;
    return { DIFFS, ALL_TOPICS };
  } catch (err) {
    console.warn('Question meta lookup failed, using fallback lists:', err?.message || err);
    return { DIFFS: FALLBACK_DIFFS, ALL_TOPICS: FALLBACK_TOPICS };
  }
}


// --------- Redis Key Helpers ---------

/** FIFO queue key for one (difficulty, topic) bucket */
function bucketKey(diff, topic) { return `Q:${diff}:${topic}`; }

/** Set of all bucket keys a user has been added to (so we can LREM them later) */
function userBucketsKey(userId) { return `UB:${userId}`; }

/** User’s request record (status, timestamps, last criteria, etc.) */
function reqKey(userId) { return `R:${userId}`; }

/** Pair record (two users + handshake state + expiry) */
function pairKey(pairId) { return `PAIR:${pairId}`; }

/** Indexes for sweeper scans */
const ACTIVE_USERS = 'IDX:ACTIVE_USERS';
const ACTIVE_PAIRS = 'IDX:ACTIVE_PAIRS';


// --------- Criteria → Buckets ---------

/**
 * Build the list of bucket keys for the user’s criteria.
 * If difficulty not chosen → all difficulties. If topics empty → all topics.
 * This supports:
 * - only difficulty selected (go into all topics of that difficulty), or
 * - only topic(s) selected (go into all difficulties of those topics), or
 * - both selected (Cartesian product).
 */
function buildBuckets({ difficulty, topics }, DIFFS, ALL_TOPICS) {
  const diffs = difficulty ? [difficulty] : DIFFS;
  const tps = (topics && topics.length) ? topics : ALL_TOPICS;
  const keys = [];
  for (const d of diffs) for (const t of tps) keys.push(bucketKey(d, t));
  return keys;
}


/**
 * Enqueue the user into all relevant buckets (by userId).
 * Also store their criteria & timestamps in R:<userId>, and track them in ACTIVE_USERS.
 */
async function enqueueByCriteria(userId, { difficulty, topics }, seniorityTs, DIFFS, ALL_TOPICS) {
  const diffList = Array.isArray(difficulty)
    ? difficulty.filter(Boolean)
    : (difficulty ? [difficulty] : []);
  const uniqueDiffs = Array.from(new Set(diffList));
  const appliedDiffs = uniqueDiffs.length ? uniqueDiffs : (difficulty ? [difficulty] : []);

  let keys = [];
  if (!appliedDiffs.length) {
    keys = buildBuckets({ difficulty: null, topics }, DIFFS, ALL_TOPICS);
  } else {
    for (const diff of appliedDiffs) {
      keys.push(...buildBuckets({ difficulty: diff, topics }, DIFFS, ALL_TOPICS));
    }
  }
  for (const k of keys) {
    await redis.rpush(k, String(userId));
  }
  await redis.sadd(userBucketsKey(userId), keys);
  const queueTs = Date.now();
  await redis
    .multi()
    .hset(reqKey(userId), {
      status: 'QUEUED',
      createdAt: queueTs,
      seniorityTs,
      difficulty: appliedDiffs.length ? JSON.stringify(appliedDiffs) : '',
      topics: JSON.stringify(topics || [])
    })
    .hdel(reqKey(userId), 'pairId', 'expiresAt', 'sessionId', 'lastEvent')
    .exec();
  console.log(`Setting status QUEUED for user ${userId}`);
  console.log(`Buckets for ${userId}:`, keys);
  await redis.sadd(ACTIVE_USERS, String(userId));
  return keys;
}

/** 
 * Requeue a user using their last stored criteria, preserving original seniority timestamp.
 * Used in declineMatch and sweeper expiry handling.
 */
async function requeueFromStoredCriteria(userId, bearerToken) {
  const r = await redis.hgetall(reqKey(userId));
  const seniorityTs = Number(r?.seniorityTs || Date.now());
  const { diffList, difficulty, topics } = await getStoredCriteria(userId);

  const { DIFFS, ALL_TOPICS } = await getCanonicalLists(bearerToken);

  const criteriaDifficulty = diffList.length ? diffList : (difficulty ? [difficulty] : []);
  const keys = await enqueueByCriteria(
    userId,
    { difficulty: criteriaDifficulty, topics },
    seniorityTs,
    DIFFS,
    ALL_TOPICS
  );
  await tryMatch(userId, keys);
}

/**
 * retryRequest(userId, mode):
 * - mode === 'same': re-enqueue with the same criteria.
 * - mode === 'broaden': relax difficulties by +-1
 **/
export async function retryRequest(userId, mode = 'same', bearerToken) {
  const r = await redis.hgetall(reqKey(userId));
  if (!r || !r.status) return { error: 'No request' };

  await cleanupUserFromBuckets(userId);

  const { difficulty, diffList, topics } = await getStoredCriteria(userId);
  const seniorityTs = Number(r.seniorityTs) || Date.now();

  const { DIFFS, ALL_TOPICS } = await getCanonicalLists(bearerToken);

  let nextDiffs = diffList.length ? [...diffList] : (difficulty ? [difficulty] : []);
  if (mode === 'broaden') {
    const relaxed = findRelaxCandidate(nextDiffs, DIFFS);
    if (!relaxed) {
      return { error: 'No adjacent difficulty available to relax' };
    }
    nextDiffs.push(relaxed);
    const keys = await enqueueByCriteria(
      userId,
      { difficulty: nextDiffs, topics },
      seniorityTs,
      DIFFS,
      ALL_TOPICS
    );
    await tryMatch(userId, keys);
    return { ok: true, mode: 'broaden', applied: { difficulty: relaxed } };
  }

  const keys = await enqueueByCriteria(
    userId,
    { difficulty: nextDiffs, topics },
    seniorityTs,
    DIFFS,
    ALL_TOPICS
  );
  await tryMatch(userId, keys);
  return { ok: true, mode: 'same' };
}

/** Safely remove a user from all bucket lists and cleanup tracking. */
async function cleanupUserFromBuckets(username) {
  const lockKey = `LOCK:cleanup:${username}`;
  const got = await redis.set(lockKey, '1', 'NX', 'EX', 10);
  if (got !== 'OK') {
    // another cleanup in progress; skip
    return;
  }

  try {
    const setKey = userBucketsKey(username);
    const keys = await redis.smembers(setKey);
    if (keys?.length) {
      const pipeline = redis.pipeline();
      for (const k of keys) {
        pipeline.lrem(k, 0, String(username));
      }
      pipeline.del(setKey);
      await pipeline.exec();
    }
    // Mark user inactive if not already in session
    const rKey = reqKey(username);
    const r = await redis.hget(rKey, 'status');
    if (r && !['SESSION_READY', 'PENDING_ACCEPT'].includes(r)) {
      await redis.hset(rKey, { status: 'NONE' });
      await redis.srem(ACTIVE_USERS, String(username));
    }
  } finally {
    await redis.del(lockKey);
  }
}

/** Read last criteria stored in R:<userId> (used for requeue/retry flows). */
async function getStoredCriteria(userId) {
  const r = await redis.hgetall(reqKey(userId));
  let difficultyField = r?.difficulty || '';
  let diffList = [];
  if (difficultyField) {
    if (difficultyField.startsWith('[')) {
      try {
        diffList = JSON.parse(difficultyField).filter(Boolean);
      } catch {
        diffList = [];
      }
    } else {
      diffList = [difficultyField];
    }
  }
  const primaryDiff = diffList[0] || '';
  let topics = [];
  try { topics = JSON.parse(r?.topics || '[]'); } catch { topics = []; }
  return { difficulty: primaryDiff, diffList, topics };
}

function adjacentDifficulties(diff, DIFFS) {
  const idx = DIFFS.indexOf(diff);
  if (idx < 0) return [];
  const out = [];
  if (idx - 1 >= 0) out.push(DIFFS[idx - 1]);
  if (idx + 1 < DIFFS.length) out.push(DIFFS[idx + 1]);
  return out;
}

function findRelaxCandidate(diffList, DIFFS) {
  if (!diffList.length) return '';
  const seen = new Set(diffList);
  for (const base of diffList) {
    const neighbors = adjacentDifficulties(base, DIFFS);
    const candidate = neighbors.find(n => !seen.has(n));
    if (candidate) return candidate;
  }
  return '';
}

// --------- Matching Core ---------

/**
 * tryMatch:
 * For each of my bucket keys, peek the head (oldest) entry.
 * If it’s me, scan a small window to find the first non-self.
 * Use a Redis NX lock to avoid race conditions if multiple servers try to match the same pair.
 * If we win, remove both users from all their buckets, create a PAIR with expiry, and set both to PENDING_ACCEPT.
 */
async function tryMatch(userId, myKeys) {
  for (const k of myKeys) {
    let other = await redis.lindex(k, 0);
    if (!other) continue;

    // If head is me, look slightly deeper for the first non-me
    if (String(other) === String(userId)) {
      const window = await redis.lrange(k, 0, 9);
      other = window.find(u => u !== String(userId));
      if (!other) continue;
    }

    // Lock the pair in a stable (sorted) order to prevent duplicate matches across instances
    const [a, b] = [String(userId), String(other)].sort();
    const lockKey = `LOCK:match:${a}:${b}`;
    const got = await redis.set(lockKey, '1', 'NX', 'EX', 30); // 30s lock TTL is enough for handshake setup
    if (got !== 'OK') continue; // someone else grabbed it

    // Remove both from all their buckets
    await cleanupUserFromBuckets(other);
    await cleanupUserFromBuckets(userId);

    // Create the pair with a handshake expiry
    const pairId = `${a}__${b}__${Date.now()}`;    // readable & unique
    const expiresAt = Date.now() + ACCEPT_WIN * 1000;

    console.log(`Matched users ${a} and ${b} into pair ${pairId}`);
    await redis.hset(pairKey(pairId), { u1: a, u2: b, aAccepted: 0, bAccepted: 0, expiresAt });
    await redis.hset(reqKey(userId), { status: 'PENDING_ACCEPT', pairId, expiresAt });
    await redis.hset(reqKey(other),    { status: 'PENDING_ACCEPT', pairId, expiresAt });
    await redis.sadd(ACTIVE_PAIRS, pairId);

    // (Optional) emit WS notification to both users here
    return; // matched once is enough
  }
}

// --------- Public API (called by your Express routes) ---------

/**
 * createRequest(userId, criteria):
 * - Validates 1–3 total “categories” (difficulty counts as 1, each topic counts as 1).
 * - Clears old state (if any).
 * - Enqueues into all relevant buckets.
 * - Attempts immediate match.
 */
export async function createRequest(userId, { difficulty, topics = [] }, bearerToken) {
  // Fetch canonical lists from Question Service
  const { DIFFS, ALL_TOPICS } = await getCanonicalLists(bearerToken);

  const validTopics = new Set([...ALL_TOPICS, ...FALLBACK_TOPICS]);

  const total = (difficulty ? 1 : 0) + (topics?.length || 0);
  if (total < 1 || total > 3) {
    return { error: 'Please select between 1 and 3 categories in total.' };
  }

  // Normalize difficulty case to an exact entry if you want (optional):
  if (difficulty) {
    // strict check
    if (!DIFFS.includes(difficulty)) {
      return { error: `Invalid difficulty: ${difficulty}` };
    }
  }

  // Check if any of the topics is not valid (including fallback topics)
  const invalidTopics = (topics || []).filter(t => !validTopics.has(t));
  if (invalidTopics.length) {
    return { error: `Invalid topics: ${invalidTopics.join(', ')}` };
  }

  await cancelMyRequest(userId);

  const seniorityTs = Date.now();
  const keys = await enqueueByCriteria(userId, { difficulty, topics }, seniorityTs, DIFFS, ALL_TOPICS);
  await tryMatch(userId, keys);
  return { ok: true };
}


/**
 * acceptMatch(userId, pairId):
 * - Marks the caller’s side as accepted.
 * - If both sides accepted → create collaboration session → set both to SESSION_READY and clean up pair.
 */
export async function acceptMatch(userId, pairId, bearerToken) {
  const pK = pairKey(pairId);
  const p = await redis.hgetall(pK);
  if (!p || !p.u1) return { error: 'Pair not found' };

  const field =
    (String(userId) === p.u1) ? 'aAccepted' :
    (String(userId) === p.u2) ? 'bAccepted' : null;
  if (!field) return { error: 'Not part of this pair' };

  await redis.hset(pK, field, 1);

  const updated = await redis.hgetall(pK);
  const meIsU1 = String(userId) === updated.u1;
  const otherUserId = meIsU1 ? updated.u2 : updated.u1;

  await redis.hset(reqKey(userId), { lastEvent: 'YOU_ACCEPTED' });
  if (otherUserId) {
    await redis.hset(reqKey(otherUserId), { lastEvent: 'PARTNER_ACCEPTED' });
  }

  if (updated.aAccepted === '1' && updated.bAccepted === '1') {
    // Derive shared criteria
    const aCrit = await getStoredCriteria(updated.u1);
    const bCrit = await getStoredCriteria(updated.u2);
    const aDiffs = aCrit.diffList.length ? aCrit.diffList : (aCrit.difficulty ? [aCrit.difficulty] : []);
    const bDiffs = bCrit.diffList.length ? bCrit.diffList : (bCrit.difficulty ? [bCrit.difficulty] : []);
    const bSet = new Set(bDiffs);
    let difficulty = '';
    for (const diff of DIFF_ORDER) {
      if (aDiffs.includes(diff) && bSet.has(diff)) {
        difficulty = diff;
        break;
      }
    }
    if (!difficulty) {
      difficulty = aDiffs.find(d => bSet.has(d)) || aDiffs[0] || bDiffs[0] || '';
    }
    const aTopics = new Set(aCrit.topics || []);
    const bTopics = new Set(bCrit.topics || []);
    const intersect = [...aTopics].filter(t => bTopics.has(t));
    const topics = (intersect.length ? intersect :
                    (aCrit.topics?.length ? aCrit.topics :
                    (bCrit.topics || [])));

    // Ask Question Service for a concrete problem id
    const questionId = await pickQuestionId(bearerToken, { difficulty, topics });

    // Both accepted → create collab session and finalize
    const participants = [p.u1, p.u2];
    const session = await createSession({ participants });

    await redis.hset(reqKey(p.u1), {
      status: 'SESSION_READY',
      sessionId: session.sessionId,
      roomId: session.roomId,
      wsUrl: session.wsUrl,
      wsAuthToken: session.tokens[p.u1],
      questionId: questionId || '',
      lastEvent: 'BOTH_ACCEPTED'
    });
    await redis.hset(reqKey(p.u2), {
      status: 'SESSION_READY',
      sessionId: session.sessionId,
      roomId: session.roomId,
      wsUrl: session.wsUrl,
      wsAuthToken: session.tokens[p.u2],
      questionId: questionId || '',
      lastEvent: 'BOTH_ACCEPTED'
    });
    await redis.srem(ACTIVE_PAIRS, pairId);
    await redis.del(pK);
  }
  return { ok: true };
}

/**
 * declineMatch(userId, pairId):
 * - If one declines, we requeue the other user (the one who did NOT decline) using their stored criteria.
 * - The decliner becomes status=NONE (no active request).
 * - Pair record is cleaned up.
 */
export async function declineMatch(userId, pairId, bearerToken) {
  const pK = pairKey(pairId);
  const p = await redis.hgetall(pK);
  if (!p || !p.u1) return { error: 'Pair not found' };

  const other = (String(userId) === p.u1)
    ? p.u2
    : (String(userId) === p.u2) ? p.u1 : null;

  if (!other) return { error: 'Not part of this pair' };

  // Requeue the other (non-decliner)
  await requeueFromStoredCriteria(other, bearerToken);
  await redis.hset(reqKey(other), { lastEvent: 'PARTNER_DECLINED' });

  // Decliner becomes inactive
  await redis.hset(reqKey(userId), { status: 'NONE', lastEvent: 'YOU_DECLINED' });
  await redis.srem(ACTIVE_USERS, String(userId));

  // Cleanup the pair record
  await redis.srem(ACTIVE_PAIRS, pairId);
  await redis.del(pK);

  return { ok: true };
}

/** getStatus(userId): returns the current request hash or { status: 'NONE' } if nothing active. */
export async function getStatus(userId) {
  const r = await redis.hgetall(reqKey(userId));
  if (!r?.status) return { status: 'NONE' };

  const out = { status: r.status };
  if (r.pairId) out.pairId = r.pairId;
  if (r.expiresAt) out.expiresAt = Number(r.expiresAt);
  if (r.sessionId) out.sessionId = r.sessionId;
  if (r.roomId) out.roomId = r.roomId;
  if (r.wsUrl) out.wsUrl = r.wsUrl;
  if (r.wsAuthToken) out.wsAuthToken = r.wsAuthToken;
  if (r.questionId) out.questionId = r.questionId;

  if (r.lastEvent) {
    out.event = r.lastEvent;
    await redis.hdel(reqKey(userId), 'lastEvent');
  }

  if (r.status === 'PENDING_ACCEPT' && r.pairId) {
    const pair = await redis.hgetall(pairKey(r.pairId));
    if (pair && pair.u1 && pair.u2) {
      const isU1 = String(userId) === pair.u1;
      out.accepted = isU1 ? pair.aAccepted === '1' : pair.bAccepted === '1';
      out.partnerAccepted = isU1 ? pair.bAccepted === '1' : pair.aAccepted === '1';
    }
  }

  return out;
}

/** cancelMyRequest(userId): remove user from all buckets and clear their request state. */
export async function cancelMyRequest(userId) {
  await cleanupUserFromBuckets(userId);
  await redis.del(reqKey(userId));
  await redis.srem(ACTIVE_USERS, String(userId));
}


// --------- Pair Helpers (optional, handy for debugging/inspection) ---------

export async function getPair(pairId) {
  return await redis.hgetall(pairKey(pairId));
}

export async function getPairForUser(userId) {
  const r = await redis.hgetall(reqKey(userId));
  if (!r?.pairId) return null;
  const p = await redis.hgetall(pairKey(r.pairId));
  return p && Object.keys(p).length ? { pairId: r.pairId, ...p } : null;
}


// --------- Sweeper (NFR1.1 handling + F1.2 timeouts) ---------

/**
 * startSweeper():
 * Periodically:
 * 1) Remove/expire QUEUED requests that have exceeded TTL (NFR1.1).
 * 2) Expire PENDING_ACCEPT pairs whose accept window passed.
 *    - If only one accepted: requeue that user; the other becomes NONE.
 *    - If neither accepted: requeue both.
 *    - If both accepted: acceptMatch() already cleaned things up; do nothing here.
 */
export function startSweeper() {
  setInterval(async () => {
    const now = Date.now();

    // (1) Expire stale QUEUED requests (TTL)
    const userIds = await redis.smembers(ACTIVE_USERS);
    for (const u of userIds) {
      const r = await redis.hgetall(reqKey(u));
      if (!r || !r.status) {
        await redis.srem(ACTIVE_USERS, u);
        continue;
      }
      if (r.status === 'QUEUED') {
        const createdAt = Number(r.createdAt || 0);
        if (createdAt && now - createdAt >= TTL * 1000) {
          await cleanupUserFromBuckets(u);
          await redis
            .multi()
            .hset(reqKey(u), { status: 'EXPIRED', lastEvent: 'REQUEST_TIMEOUT' })
            .hdel(reqKey(u), 'pairId', 'expiresAt', 'sessionId')
            .exec();
          await redis.srem(ACTIVE_USERS, u);
          // TODO: emit WS event → "Your request expired. Tap to retry."
        }
      }
    }

    // (2) Expire PENDING_ACCEPT pairs whose window passed
    const pairs = await redis.smembers(ACTIVE_PAIRS);
    for (const pid of pairs) {
      const p = await redis.hgetall(pairKey(pid));
      if (!p || !p.expiresAt) {
        await redis.srem(ACTIVE_PAIRS, pid);
        continue;
      }
      if (now >= Number(p.expiresAt)) {
        const aAccepted = p.aAccepted === '1';
        const bAccepted = p.bAccepted === '1';
        const u1 = p.u1, u2 = p.u2;

        if (aAccepted && !bAccepted) {
          await requeueFromStoredCriteria(u1);
          await redis.hset(reqKey(u1), { lastEvent: 'PARTNER_TIMEOUT' });
          await redis
            .multi()
            .hset(reqKey(u2), { status: 'NONE', lastEvent: 'YOU_TIMEOUT' })
            .hdel(reqKey(u2), 'pairId', 'expiresAt', 'sessionId')
            .exec();
          await redis.srem(ACTIVE_USERS, String(u2));
        } else if (!aAccepted && bAccepted) {
          await requeueFromStoredCriteria(u2);
          await redis.hset(reqKey(u2), { lastEvent: 'PARTNER_TIMEOUT' });
          await redis
            .multi()
            .hset(reqKey(u1), { status: 'NONE', lastEvent: 'YOU_TIMEOUT' })
            .hdel(reqKey(u1), 'pairId', 'expiresAt', 'sessionId')
            .exec();
          await redis.srem(ACTIVE_USERS, String(u1));
        } else if (!aAccepted && !bAccepted) {
          // nobody accepted → requeue both
          await requeueFromStoredCriteria(u1);
          await requeueFromStoredCriteria(u2);
          await redis.hset(reqKey(u1), { lastEvent: 'PAIR_TIMEOUT' });
          await redis.hset(reqKey(u2), { lastEvent: 'PAIR_TIMEOUT' });
        }
        // else both accepted: already handled by acceptMatch()

        await redis.srem(ACTIVE_PAIRS, pid);
        await redis.del(pairKey(pid));
      }
    }
  }, SWEEP * 1000);
}
