// backend/routes/history.js
import { Router } from 'express';
import { query, queryOne, execute } from '../db/turso.js';
import { requireUserId } from '../middleware/userId.js';

const router = Router();

// GET /api/history?limit=50&unique=1
//   unique=1 → dedupe by track (keeps most recent play of each track).
router.get('/', requireUserId, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const unique = req.query.unique === '1' || req.query.unique === 'true';

  let rows;
  if (unique) {
    rows = (await query(`SELECT track_source, track_ref_id, track_json, track_title, track_artist, track_image, MAX(played_at) AS played_at
       FROM listening_history WHERE user_id = ?
       GROUP BY track_source, track_ref_id
       ORDER BY played_at DESC
       LIMIT ?`, [req.userId, limit]));
  } else {
    rows = (await query(`SELECT track_source, track_ref_id, track_json, track_title, track_artist, track_image, played_at
       FROM listening_history WHERE user_id = ?
       ORDER BY played_at DESC
       LIMIT ?`, [req.userId, limit]));
  }

  const entries = rows.map(r => {
    let track = null;
    try { track = r.track_json ? JSON.parse(r.track_json) : null; } catch {}
    return {
      track,
      source: r.track_source,
      refId: r.track_ref_id,
      title: r.track_title,
      artist: r.track_artist,
      image: r.track_image,
      playedAt: r.played_at,
    };
  });

  res.json({ entries });
});

// POST /api/history  { track }
router.post('/', requireUserId, async (req, res) => {
  const { track } = req.body || {};
  if (!track?.id || !track.source || !track.sourceId) {
    return res.status(400).json({ error: 'track.id, track.source, track.sourceId required' });
  }

  (await execute(`INSERT INTO listening_history
       (user_id, track_source, track_ref_id, track_json, track_title, track_artist, track_image)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [req.userId,
    track.source,
    String(track.sourceId),
    JSON.stringify(track),
    track.title || null,
    track.artist?.name || null,
    track.image || null]));

  res.status(201).json({ ok: true });
});

// DELETE /api/history
router.delete('/', requireUserId, async (req, res) => {
  const result = (await execute(`DELETE FROM listening_history WHERE user_id = ?`, [req.userId]));
  res.json({ ok: true, removed: result.changes });
});

export default router;