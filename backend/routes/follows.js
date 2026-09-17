// backend/routes/follows.js
import { Router } from 'express';
import { query, queryOne, execute } from '../db/turso.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const sanitize = (u) => ({
  id: u.id,
  username: u.username,
  display_name: u.display_name,
  avatar_path: u.avatar_path,
  bio: u.bio,
  is_verified_artist: !!u.is_verified_artist,
});

// ---------- Me ----------

// GET /api/follows/me/following — array of user IDs I follow (for followStore)
router.get('/me/following', requireAuth, async (req, res) => {
  const rows = (await query(`SELECT followee_id FROM follows WHERE follower_id = ?`, [`user:${req.user.id}`]));
  res.json({ following: rows.map(r => r.followee_id) });
});

// ---------- Follow / unfollow ----------

router.post('/:userId', requireAuth, async (req, res) => {
  const followeeId = parseInt(req.params.userId, 10);
  if (!Number.isInteger(followeeId)) return res.status(400).json({ error: 'Invalid user id' });
  if (followeeId === req.user.id) return res.status(400).json({ error: "You can't follow yourself" });

  const target = (await queryOne('SELECT id FROM users WHERE id = ?', [followeeId]));
  if (!target) return res.status(404).json({ error: 'User not found' });

  (await execute(`INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)`, [`user:${req.user.id}`, followeeId]));

  res.status(201).json({ ok: true });
});

router.delete('/:userId', requireAuth, async (req, res) => {
  const followeeId = parseInt(req.params.userId, 10);
  (await execute(`DELETE FROM follows WHERE follower_id = ? AND followee_id = ?`, [`user:${req.user.id}`, followeeId]));
  res.json({ ok: true });
});

// ---------- Public per-user ----------

// GET /api/follows/users/:userId — counts
router.get('/users/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Invalid id' });

  const followers = (await queryOne(`SELECT COUNT(*) AS c FROM follows WHERE followee_id = ?`, [userId])).c;
  const following = (await queryOne(`SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?`, [`user:${userId}`])).c;

  res.json({ followers, following });
});

// GET /api/follows/users/:userId/followers
//   NOTE: follower_id is TEXT ('user:1'), users.id is INTEGER — must cast.
router.get('/users/:userId/followers', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Invalid id' });

  const rows = (await query(`SELECT u.id, u.username, u.display_name, u.avatar_path, u.bio, u.is_verified_artist
     FROM follows f
     JOIN users u ON u.id = CAST(REPLACE(f.follower_id, 'user:', '') AS INTEGER)
     WHERE f.followee_id = ?
     ORDER BY f.created_at DESC`, [userId]));

  res.json({ users: rows.map(sanitize) });
});

// GET /api/follows/users/:userId/following
router.get('/users/:userId/following', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Invalid id' });

  const rows = (await query(`SELECT u.id, u.username, u.display_name, u.avatar_path, u.bio, u.is_verified_artist
     FROM follows f
     JOIN users u ON u.id = f.followee_id
     WHERE f.follower_id = ?
     ORDER BY f.created_at DESC`, [`user:${userId}`]));

  res.json({ users: rows.map(sanitize) });
});

// ---------- Search ----------

router.get('/search', async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json({ users: [] });
  const rows = (await query(`SELECT id, username, display_name, avatar_path, bio, is_verified_artist
     FROM users
     WHERE username LIKE ? OR display_name LIKE ?
     LIMIT 20`, [`%${q}%`, `%${q}%`]));
  res.json({ users: rows.map(sanitize) });
});

export default router;