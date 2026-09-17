// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import { query, queryOne, execute } from '../db/turso.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

export function signToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = (await queryOne('SELECT id, username, email, display_name, avatar_path, bio, is_verified_artist, is_admin FROM users WHERE id = ?', [payload.userId]));

    if (!user) return res.status(401).json({ error: 'User no longer exists' });

    req.userId = user.id;
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireVerifiedArtist(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.is_verified_artist) {
      return res.status(403).json({ error: 'Verified artist access required' });
    }
    next();
  });
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}