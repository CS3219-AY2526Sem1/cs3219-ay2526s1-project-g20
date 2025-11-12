import jwt from 'jsonwebtoken';

const COLLAB_WS_PUBLIC_URL =
  process.env.COLLAB_WS_PUBLIC_URL || 'ws://localhost:8090/ws';
const COLLAB_JWT_SECRET =
  process.env.COLLAB_JWT_SECRET || 'dev-collab-secret';
const COLLAB_JWT_ISSUER =
  process.env.COLLAB_JWT_ISSUER || 'peerprep-matching';
const COLLAB_JWT_AUDIENCE =
  process.env.COLLAB_JWT_AUDIENCE || 'collab';
const SESSION_TTL_MIN = Number(process.env.COLLAB_SESSION_TTL_MIN || 120);

export async function createSession({ participants }) {
  const roomId = `room_${Date.now()}`;

  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + SESSION_TTL_MIN * 60;

  // In practice, return an array of tokens keyed by userId. For simplicity, return a template the UI can use.
  // The UI only needs: wsUrl, roomId, and a token that encodes { sub: userId, roomId }.
  function tokenFor(userId) {
    return jwt.sign(
      { sub: String(userId), roomId },
      COLLAB_JWT_SECRET,
      { algorithm: 'HS256', issuer: COLLAB_JWT_ISSUER, audience: COLLAB_JWT_AUDIENCE, expiresIn: SESSION_TTL_MIN * 60 }
    );
  }

  return {
    sessionId: roomId,
    roomId,
    wsUrl: COLLAB_WS_PUBLIC_URL,
    // If you prefer separate tokens, return a map; for a quick path return a single token for now
    tokens: Object.fromEntries(participants.map(u => [u, tokenFor(u)])),
  };
}
