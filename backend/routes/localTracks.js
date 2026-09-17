// backend/routes/localTracks.js
import { Router } from 'express';
import { query, queryOne, execute } from '../db/turso.js';

const router = Router();

function serializeTrack(row) {
  return {
    id: `local:${row.id}`,
    dbId: row.id,
    source: 'local',
    sourceId: String(row.id),
    title: row.title,
    duration: row.duration || 0,
    audio: row.audio_path,
    image: row.image_path,
    playCount: row.play_count || 0,
    album: row.album_name ? {
      id: row.album_id,
      name: row.album_name,
      image: row.album_cover || null,
    } : null,
    artist: {
      id: row.artist_id,
      name: row.artist_display_name || row.artist_username || 'Unknown Artist',
      handle: row.artist_username || null,
      image: row.artist_avatar || null,
    },
    createdAt: row.created_at,
  };
}

const TRACK_SELECT = `
  SELECT t.*,
         u.display_name AS artist_display_name,
         u.username     AS artist_username,
         u.avatar_path  AS artist_avatar,
         a.name         AS album_name,
         a.cover_path   AS album_cover,
         (SELECT COUNT(*) FROM listening_history h
          WHERE h.track_source = 'local'
            AND CAST(h.track_ref_id AS INTEGER) = t.id) AS play_count
  FROM tracks t
  LEFT JOIN albums a ON a.id = t.album_id
  LEFT JOIN users  u ON u.id = t.artist_id
`;

// GET /api/local-tracks/recent?limit=20
//   Public — most recently uploaded local tracks, newest first.
router.get('/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '12', 10), 50);
    const rows = (await query(`${TRACK_SELECT}
       WHERE t.source = 'local' AND t.audio_path IS NOT NULL
       ORDER BY t.created_at DESC, t.id DESC
       LIMIT ?`, [limit]));

    res.set('Cache-Control', 'no-store');
    res.json({ tracks: rows.map(serializeTrack) });
  } catch (err) {
    console.error('[local-tracks] recent failed:', err.message);
    res.status(500).json({ error: 'Failed to load recent tracks' });
  }
});

export default router;