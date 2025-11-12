import axios from 'axios';

function getBase() {
  // Read at call time so .env overrides and runtime exports are always honored
  return process.env.USER_SVC_BASE || 'http://localhost:8000';
}

export async function getMyProfile(bearer) {
  if (!bearer) throw new Error('Missing bearer');
  const { data } = await axios.get(`${getBase()}/profile`, {
    headers: { Authorization: bearer }
  });
  return data; // { id, email, username, account_creation_date, last_login }
}

export async function getPublicUser(userId, maybeBearer) {
  const headers = {};
  if (maybeBearer) headers.Authorization = maybeBearer; // optional if endpoint is public
  const { data } = await axios.get(`${getBase()}/api/users/${userId}/public`, { headers });
  return data; // e.g. { id, username }
}
