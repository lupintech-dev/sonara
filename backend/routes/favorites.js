// backend/routes/favorites.js
import { Router } from 'express';
import { query, queryOne, execute } from '../db/turso.js';
import { requireUserId } from '../middleware/userId.js';

const router = Router();

// GET /api/favorites
router.get('/', requireUserId, async (req, res) => {
  const rows = (await query(`SELECT track_source, track_ref_id, track_json, created_at
     FROM favorites WHERE user_id = ?
     ORDER BY created_at DESC`, [req.userId]));

  const tracks = rows
    .map(r => {
      try { return r.track_json ? JSON.parse(r.track_json) : null; }
      catch { return null; }
    })
    .filter(Boolean);

  res.json({ tracks });
});

// POST /api/favorites  { track }
router.post('/', requireUserId, async (req, res) => {
  const { track } = req.body || {};
  if (!track?.id || !track.source || !track.sourceId) {
    return res.status(400).json({ error: 'track.id, track.source, track.sourceId required' });
  }

  const source = track.source;
  const refId  = String(track.sourceId);
  const json   = JSON.stringify(track);

  (await execute(`INSERT INTO favorites (user_id, track_source, track_ref_id, track_json)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, track_source, track_ref_id)
     DO UPDATE SET track_json = excluded.track_json`, [req.userId, source, refId, json]));

  res.status(201).json({ ok: true });
});

// DELETE /api/favorites/:source/:refId
router.delete('/:source/:refId', requireUserId, async (req, res) => {
  const { source, refId } = req.params;
  const result = (await execute(`DELETE FROM favorites WHERE user_id = ? AND track_source = ? AND track_ref_id = ?`, [req.userId, source, refId]));
  res.json({ ok: true, removed: result.changes });
});

export default router;