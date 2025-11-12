// Usage examples:
//   # Option A: use real login from User Service (recommended for /profile):
//   USER_SVC_BASE=http://localhost:8000 \
//   MATCH_BASE=http://localhost:3001 \
//   TEST_USERNAME=alice TEST_PASSWORD=alicepwd \
//   node src/testUserEndpoint.js
//
//   # Option B: generate a local HS256 token (only works if your User Service
//   # accepts tokens signed with JWT_SECRET and the sub exists or is not checked):
//   MATCH_BASE=http://localhost:3001 JWT_SECRET=devsecret \
//   node src/testUserEndpoint.js
//
//   Optional: set PEER_ID to test the public endpoint for another user:
//   PEER_ID=507f1f77bcf86cd799439012 ...

import axios from 'axios';
import jwt from 'jsonwebtoken';

const MATCH_BASE = process.env.MATCH_BASE || 'http://localhost:3001';
const USER_SVC_BASE = process.env.USER_SVC_BASE || 'http://localhost:8000';
const TEST_USERNAME = process.env.TEST_USERNAME;  // for /login
const TEST_PASSWORD = process.env.TEST_PASSWORD;  // for /login
const JWT_SECRET   = process.env.JWT_SECRET || 'devsecret';
const PEER_ID      = process.env.PEER_ID;         // some other user's id

async function loginForToken() {
  if (!TEST_USERNAME || !TEST_PASSWORD) return null;
  try {
    // FastAPI OAuth2PasswordRequestForm expects form-encoded body
    const params = new URLSearchParams();
    params.append('username', TEST_USERNAME);
    params.append('password', TEST_PASSWORD);

    const { data } = await axios.post(`${USER_SVC_BASE}/login`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    if (!data?.access_token) throw new Error('No access_token in response');
    return data.access_token;
  } catch (e) {
    console.error('Login failed:', e.response?.data || e.message);
    return null;
  }
}

function generateDevToken() {
  // This generates an HS256 token with sub=<fake id>. Your Matching Service
  // will accept it (it only verifies signature by JWT_SECRET). The User Service
  // /profile may reject it if the user id doesn’t exist in its DB.
  const payload = {
    sub: '507f1f77bcf86cd799439011', // pretend user id (Mongo-style ObjectId)
    username: 'TestUser',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour
  };
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

async function callMatchMeUsername(token) {
  const { data } = await axios.get(`${MATCH_BASE}/match/me/username`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

async function callMatchPeerPublic(token, peerId) {
  // If your /api/users/{id}/public is public, the header is optional.
  const { data } = await axios.get(`${MATCH_BASE}/match/peers/${peerId}/public`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

async function callUserProfile(token) {
  // Directly hit user service to verify token works there too
  const { data } = await axios.get(`${USER_SVC_BASE}/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
}

(async function main() {
  console.log('=== testUserEndpoint.js ===');
  console.log('MATCH_BASE =', MATCH_BASE);
  console.log('USER_SVC_BASE =', USER_SVC_BASE);

  // 1) Get a token
  let token = await loginForToken();
  if (token) {
    console.log('\nObtained token via /login ✅');
  } else {
    token = generateDevToken();
    console.log('\nGenerated dev token (HS256) ⚠️');
    console.log('(User Service /profile may reject this if the user id does not exist.)');
  }
  console.log('\nBearer token (truncated):', token.slice(0, 32) + '...');

  // 2) Hit Matching Service helper: /match/me/username
  try {
    const me = await callMatchMeUsername(token);
    console.log('\n/match/me/username →', me);
  } catch (e) {
    console.error('\n/match/me/username failed:', e.response?.data || e.message);
  }

  // 3) Optionally, call User Service /profile (verifies the token is valid there too)
  try {
    const profile = await callUserProfile(token);
    console.log('\n/user-service /profile →', profile);
  } catch (e) {
    console.error('\n/user-service /profile failed:', e.response?.data || e.message);
  }

  // 4) Optionally, hit peer public info
  if (PEER_ID) {
    try {
      const pub = await callMatchPeerPublic(token, PEER_ID);
      console.log(`\n/match/peers/${PEER_ID}/public →`, pub);
    } catch (e) {
      console.error(`\n/match/peers/${PEER_ID}/public failed:`, e.response?.data || e.message);
    }
  }

  console.log('\n=== Done ===');
})();
