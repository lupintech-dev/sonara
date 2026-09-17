// backend/routes/jamendo.js
import { Router } from 'express';
import {
  searchTracks,
  getTrackById,
  getPopularTracks,
  getArtistById,
  getArtistTracks,
} from '../services/jamendo.js';

const router = Router();

router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json({ tracks: [] });
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const tracks = await searchTracks(q, limit);
    res.json({ tracks });
  } catch (err) {
    console.error('[jamendo] search failed:', err.message);
    res.status(502).json({ error: 'Jamendo search failed', detail: err.message });
  }
});

router.get('/popular', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const genre = req.query.genre?.toString() || null;
    const tracks = await getPopularTracks(limit, genre);
    res.json({ tracks });
  } catch (err) {
    console.error('[jamendo] popular failed:', err.message);
    res.status(502).json({ error: 'Jamendo popular failed', detail: err.message });
  }
});

router.get('/tracks/:id', async (req, res) => {
  try {
    const track = await getTrackById(req.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json({ track });
  } catch (err) {
    console.error('[jamendo] getTrack failed:', err.message);
    res.status(502).json({ error: 'Jamendo track fetch failed', detail: err.message });
  }
});

router.get('/artists/:id', async (req, res) => {
  try {
    const artist = await getArtistById(req.params.id);
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    res.json({ artist });
  } catch (err) {
    console.error('[jamendo] getArtist failed:', err.message);
    res.status(502).json({ error: 'Jamendo artist fetch failed', detail: err.message });
  }
});

router.get('/artists/:id/tracks', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '25', 10), 100);
    const tracks = await getArtistTracks(req.params.id, limit);
    res.json({ tracks });
  } catch (err) {
    console.error('[jamendo] getArtistTracks failed:', err.message);
    res.status(502).json({ error: 'Jamendo artist tracks failed', detail: err.message });
  }
});

export default router;