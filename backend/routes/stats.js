// backend/routes/stats.js
import { Router } from 'express';
import { query, queryOne, execute } from '../db/turso.js';
import { requireUserId } from '../middleware/userId.js';

const router = Router();

function safeParse(s) {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
}

// GET /api/stats/me — everything the Wrapped page needs in one call
router.get('/me', requireUserId, async (req, res) => {
  const userId = req.userId;

  const rows = (await query(`SELECT track_source, track_ref_id, track_json, played_at
     FROM listening_history
     WHERE user_id = ?
     ORDER BY played_at DESC`, [userId]));

  let totalSeconds = 0;
  const totalPlays = rows.length;

  const trackCounts  = new Map(); // id -> { count, track }
  const artistCounts = new Map(); // name -> { count, image }
  const genreCounts  = new Map(); // genre -> count
  const monthCounts  = new Map(); // 'YYYY-MM' -> count
  const hourCounts   = new Array(24).fill(0); // hour of day

  for (const row of rows) {
    const t = safeParse(row.track_json);
    if (!t) continue;

    // Duration
    totalSeconds += t.duration || 0;

    // Track counts
    const tid = t.id;
    if (tid) {
      const existing = trackCounts.get(tid);
      if (existing) existing.count++;
      else trackCounts.set(tid, { count: 1, track: t });
    }

    // Artist counts
    const artistName = t.artist?.name;
    if (artistName) {
      const existing = artistCounts.get(artistName);
      if (existing) existing.count++;
      else artistCounts.set(artistName, {
        count: 1,
        image: t.artist?.image || t.image || null,
      });
    }

    // Genre counts
    const genre = (t.genre || t.mood || '').toString().trim();
    if (genre) {
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    }

    // Month counts
    const month = (row.played_at || '').slice(0, 7); // 'YYYY-MM'
    if (month) monthCounts.set(month, (monthCounts.get(month) || 0) + 1);

    // Hour of day
    const hour = parseInt((row.played_at || '').slice(11, 13), 10);
    if (!isNaN(hour)) hourCounts[hour] += 1;
  }

  const topTracks = [...trackCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map(({ track, count }) => ({ track, count }));

  const topArtists = [...artistCounts.entries()]
    .map(([name, x]) => ({ name, image: x.image, count: x.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topGenres = [...genreCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const monthly = [...monthCounts.entries()]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Peak listening hour
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const hasPlays = totalPlays > 0;

  res.json({
    stats: {
      totalSeconds,
      totalMinutes: Math.round(totalSeconds / 60),
      totalHours: Math.round(totalSeconds / 3600 * 10) / 10,
      totalPlays,
      uniqueTracks: trackCounts.size,
      uniqueArtists: artistCounts.size,
      peakHour: hasPlays ? peakHour : null,
    },
    topTracks,
    topArtists,
    topGenres,
    monthly,
  });
});

export default router;