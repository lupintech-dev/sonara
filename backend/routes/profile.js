// backend/routes/profile.js
import { Router } from 'express';
import { query, queryOne, execute } from '../db/turso.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

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

// PUT /api/profile — update display_name, bio
router.put('/', requireAuth, async (req, res) => {
  const { display_name, bio } = req.body || {};

  const updates = [];
  const params = [];

  if (display_name !== undefined) {
    if (typeof display_name !== 'string') {
      return res.status(400).json({ error: 'Invalid display_name' });
    }
    if (display_name.length > 60) {
      return res.status(400).json({ error: 'Display name must be 60 characters or fewer' });
    }
    updates.push('display_name = ?');
    params.push(display_name.trim() || null);
  }

  if (bio !== undefined) {
    if (typeof bio !== 'string') {
      return res.status(400).json({ error: 'Invalid bio' });
    }
    if (bio.length > 500) {
      return res.status(400).json({ error: 'Bio must be 500 characters or fewer' });
    }
    updates.push('bio = ?');
    params.push(bio.trim() || null);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  params.push(req.user.id);
  (await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, [...params]));

  const user = (await queryOne('SELECT id, username, email, display_name, avatar_path, bio, is_verified_artist, is_admin FROM users WHERE id = ?', [req.user.id]));

  res.json({ user: sanitize(user) });
});

export default router;