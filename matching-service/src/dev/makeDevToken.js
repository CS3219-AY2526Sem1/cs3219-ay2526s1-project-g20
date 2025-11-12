import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// Use a fake but stable user id for testing (looks like a Mongo ObjectId)
const payload = {
  sub: process.env.TEST_USER_ID || '507f1f77bcf86cd799439011',
  username: process.env.TEST_USERNAME || 'TestUser',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour
};

const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
console.log(token);
