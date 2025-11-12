import express from 'express';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// POST /login (returns a signed token with sub=userId)
app.post('/login', (req, res) => {
  const { username = 'alice' } = req.body;
  const fakeId = username === 'alice'
    ? '507f1f77bcf86cd799439011'
    : '507f1f77bcf86cd799439012';
  const token = jwt.sign(
    { sub: fakeId, username },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
  res.json({ access_token: token, token_type: 'bearer' });
});

// Auth middleware for mock
function auth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// GET /profile (protected)
app.get('/profile', auth, (req, res) => {
  res.json({
    id: req.user.sub,
    email: `${req.user.username}@example.com`,
    username: req.user.username,
    account_creation_date: new Date().toISOString(),
    last_login: new Date().toISOString()
  });
});

// GET /api/users/{user_id}/public (public)
app.get('/api/users/:id/public', (req, res) => {
  res.json({ id: req.params.id, username: `user_${req.params.id.slice(-4)}` });
});

app.listen(8000, () => console.log('User mock on :8000'));
