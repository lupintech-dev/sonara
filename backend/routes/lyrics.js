// backend/routes/lyrics.js
import { Router } from 'express';
import { getLyrics, debugLyrics } from '../services/lyrics.js';

const router = Router();

// GET /api/lyrics?artist=X&title=Y&duration=180&debug=1
router.get('/', async (req, res) => {
  // Never let browsers or proxies cache lyrics responses
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  const artist = (req.query.artist || '').toString().trim();
  const title  = (req.query.title  || '').toString().trim();
  const album  = (req.query.album  || '').toString().trim() || undefined;
  const durationRaw = req.query.duration;
  const duration = durationRaw ? parseInt(durationRaw, 10) : undefined;
  const debug = req.query.debug === '1';

  if (!artist || !title) {
    return res.status(400).json({ error: 'artist and title are required' });
  }

  try {
    if (debug) {
      const result = await debugLyrics({ artist, title, album, duration });
      return res.json(result);
    }
    const lyrics = await getLyrics({ artist, title, album, duration });
    res.json({ lyrics });
  } catch (err) {
    console.error('[lyrics] fetch failed:', err.message);
    res.status(502).json({ error: 'Lyrics fetch failed', detail: err.message });
  }
});

export default router;