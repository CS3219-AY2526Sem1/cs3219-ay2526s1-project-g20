// src/auth.js
import jwt from 'jsonwebtoken';

// HS256 dev only
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
// set RS256 in prod
const JWT_ALG = process.env.JWT_ALG || 'HS256';
// optional issuer and audience
const JWT_ISS = process.env.JWT_ISS;
const JWT_AUD = process.env.JWT_AUD;

export function authMiddleware(req, res, next) {
  const hdr = (req.headers.authorization || '').trim();
  const m = hdr.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'Missing token (use Authorization: Bearer <jwt>)' });

  const token = m[1].trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALG],
      issuer: JWT_ISS,
      audience: JWT_AUD
    });

    const userId = payload.sub || payload.userId || payload.user_id || payload.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Token missing user id (sub)' });
    }

    req.user = {
      id: String(userId),
      username: payload.username || payload.name || payload.preferred_username,
      // for other services to use
      token
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
