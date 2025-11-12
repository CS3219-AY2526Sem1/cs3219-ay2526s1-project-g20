import axios from 'axios';

const QUESTIONS_SVC_BASE =
  process.env.QUESTIONS_SVC_BASE || 'http://question-service:3001';

// 5-minute in-memory cache to avoid hitting questions service too often
let cache = { topics: null, diffs: null, fetchedAt: 0 };
const CACHE_TTL_MS = Number(process.env.QS_CACHE_TTL_MS || 5 * 60 * 1000);

function isFresh(ts) {
  return ts && (Date.now() - ts) < CACHE_TTL_MS;
}

/**
 * Fetch { difficulties, topics } from Question Service.
 * It uses GET /api/questions/statistics which returns:
 * { success: true, data: { byDifficulty: [{_id:"Easy",count:...},...],
 *                          byCategory:   [{_id:"Graphs",count:...},...] } }
 */
export async function getQuestionMeta(bearer) {
  if (isFresh(cache.fetchedAt) && cache.diffs?.length && cache.topics?.length) {
    return { difficulties: cache.diffs, topics: cache.topics };
  }

  const url = `${QUESTIONS_SVC_BASE}/api/questions/statistics`;
  const headers = {};
  if (bearer) headers.Authorization = bearer; // only if QS requires auth (usually not)

  const { data } = await axios.get(url, { headers });
  if (!data?.success || !data?.data) {
    throw new Error('Question Service statistics returned unexpected shape');
  }

  const byDiff = Array.isArray(data.data.byDifficulty) ? data.data.byDifficulty : [];
  const byCat  = Array.isArray(data.data.byCategory)   ? data.data.byCategory   : [];

  // Extract unique ids (ignore empty _id)
  const difficulties = byDiff.map(x => String(x._id)).filter(Boolean);
  const topics       = byCat.map(x => String(x._id)).filter(Boolean);

  if (!difficulties.length || !topics.length) {
    // Fallback just in case QS has no data yet, and I want to test locally
    const fallbackDiffs = ['Easy','Medium','Hard'];
    const fallbackTopics = ['DP','Arrays','Strings','Graphs','Trees'];
    cache = { diffs: fallbackDiffs, topics: fallbackTopics, fetchedAt: Date.now() };
    console.warn('Warning: Using fallback question metadata');
    return { difficulties: fallbackDiffs, topics: fallbackTopics };
  }

  cache = { diffs: difficulties, topics, fetchedAt: Date.now() };
  return { difficulties, topics };
}

export async function pickQuestionId(bearerToken, { difficulty = '', topics = [] }) {
  const base = process.env.QUESTIONS_SVC_BASE;
  if (!base) throw new Error('QUESTIONS_BASE_URL not set');

  // Build candidate queries (prefer intersection/first topic)
  const topicList = Array.isArray(topics) ? topics : [];
  const candidates = [
    // each selected topic paired with difficulty
    ...topicList.map(t => ({ difficulty, category: t })),
    // relax to difficulty only
    { difficulty, category: '' },
    // relax to any by topic (first topic)
    topicList.length ? { difficulty: '', category: topicList[0] } : null,
    // last resort: truly random
    { difficulty: '', category: '' },
  ].filter(Boolean);

  for (const q of candidates) {
    const params = new URLSearchParams();
    if (q.difficulty) params.set('difficulty', q.difficulty);
    if (q.category) params.set('category', q.category);
    const url = `${base}/api/questions/random?${params.toString()}`;

    try {
      const resp = await fetch(url, { headers: { Authorization: bearerToken } });
      if (!resp.ok) continue;
      const json = await resp.json();
      const id = json?.data?._id || json?.data?.id;
      if (id) return id;
    } catch {
      // try next candidate
    }
  }
  return null;
}
