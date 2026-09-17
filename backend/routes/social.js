// backend/routes/social.js
import { Router } from 'express';
import { query, queryOne } from '../db/turso.js';
import { requireUserId } from '../middleware/userId.js';

const router = Router();

function sanitize(u) {
  return {
    id: u.id,
    username: u.username,
    display_name: u.display_name,
    avatar_path: u.avatar_path,
    bio: u.bio,
  };
}

// GET /api/social/me/followers
router.get('/me/followers', requireUserId, async (req, res) => {
  const myId = parseInt(req.userId.replace('user:', ''), 10) || 0;
  const rows = await query(
    `SELECT u.id, u.username, u.display_name, u.avatar_path, u.bio
     FROM follows f JOIN users u ON u.id = f.follower_id
     WHERE f.followee_id = ? AND f.follower_id LIKE 'user:%'`,
    [myId]
  );
  res.json({ users: rows.map(sanitize) });
});

// GET /api/social/me/following
router.get('/me/following', requireUserId, async (req, res) => {
  const rows = await query(
    `SELECT u.id, u.username, u.display_name, u.avatar_path, u.bio
     FROM follows f JOIN users u ON u.id = f.followee_id
     WHERE f.follower_id = ?
     ORDER BY f.created_at DESC`,
    [req.userId]
  );
  res.json({ users: rows.map(sanitize) });
});

// GET /api/social/counts
router.get('/counts', requireUserId, async (req, res) => {
  const myId = parseInt(req.userId.replace('user:', ''), 10) || 0;
  const followers = (await queryOne(
    `SELECT COUNT(*) AS c FROM follows WHERE followee_id = ? AND follower_id LIKE 'user:%'`,
    [myId]
  )).c;
  const following = (await queryOne(
    `SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?`,
    [req.userId]
  )).c;
  res.json({ followers, following });
});

export default router;
