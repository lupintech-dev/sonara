// backend/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, execute } from '../db/turso.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitize(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    display_name: user.display_name,
    avatar_path: user.avatar_path,
    bio: user.bio,
    is_verified_artist: !!user.is_verified_artist,
    is_admin: !!user.is_admin,
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, display_name } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3â€“20 characters, letters, numbers, or underscores',
      });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (email && !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const existing = await queryOne('SELECT id FROM users WHERE username = ? OR (email IS NOT NULL AND email = ?)', [username, email || null]);
    if (existing) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await execute(`INSERT INTO users (username, email, password_hash, display_name)
       VALUES (?, ?, ?, ?)`, [username, email || null, hash, display_name || username]);

    const userId = Number(result.lastInsertRowid);
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    const token = signToken(user);

    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    console.error('[auth] register failed:', err);
    res.status(500).json({ error: 'Registration failed', detail: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username (or email) and password are required' });
    }

    const lookup = username.includes('@')
      ? await queryOne('SELECT * FROM users WHERE email = ?', [username])
      : await queryOne('SELECT * FROM users WHERE username = ?', [username]);

    if (!lookup || !lookup.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, lookup.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(lookup);
    res.json({ token, user: sanitize(lookup) });
  } catch (err) {
    console.error('[auth] login failed:', err);
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: sanitize(req.user) });
});

export default router;

