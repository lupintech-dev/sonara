// backend/routes/aiPlaylist.js
import { Router } from 'express';
import { interpretPrompt } from '../services/aiPlaylist.js';
import { searchTracks as searchAudius } from '../services/audius.js';
import { searchTracks as searchJamendo } from '../services/jamendo.js';

const router = Router();

/* Deduplicate tracks by title + artist, preserving order. */
function dedupeTracks(tracks) {
  const seen = new Set();
  const out = [];
  for (const t of tracks) {
    if (!t) continue;
    const key = `${(t.title || '').toLowerCase()}|${(t.artist?.name || '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/* Interleave two arrays so both sources are represented. */
function interleave(a, b) {
  const out = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

// POST /api/ai-playlist/generate
//   body: { prompt, limit? }
//   returns: { concept, tracks }
router.post('/generate', async (req, res) => {
  try {
    const { prompt, limit = 20 } = req.body || {};
    const maxTracks = Math.min(Math.max(parseInt(limit, 10) || 20, 5), 40);

    // 1) Ask the LLM to turn the vibe into queries
    const concept = await interpretPrompt(prompt);

    // 2) Fire off searches across both sources for every query
    const tasks = [];
    for (const q of concept.queries) {
      tasks.push(searchAudius(q, 8).catch(() => []));
      tasks.push(searchJamendo(q, 8).catch(() => []));
    }

    const results = await Promise.allSettled(tasks);

    // Pair results back up: even indices are Audius, odd are Jamendo
    const perQuery = [];
    for (let i = 0; i < results.length; i += 2) {
      const audius  = results[i]?.status === 'fulfilled'     ? results[i].value     : [];
      const jamendo = results[i + 1]?.status === 'fulfilled' ? results[i + 1].value : [];
      perQuery.push(interleave(audius, jamendo));
    }

    // Round-robin merge so tracks from every query are represented
    const merged = [];
    let idx = 0;
    while (merged.length < maxTracks * 2) {
      let added = false;
      for (const list of perQuery) {
        if (list[idx]) {
          merged.push(list[idx]);
          added = true;
          if (merged.length >= maxTracks * 2) break;
        }
      }
      if (!added) break;
      idx += 1;
    }

    const tracks = dedupeTracks(merged).slice(0, maxTracks);

    if (tracks.length === 0) {
      return res.status(404).json({
        error: 'Could not find any tracks matching that vibe. Try a broader prompt.',
      });
    }

    res.json({ concept, tracks });
  } catch (err) {
    console.error('[ai-playlist] generate failed:', err.message);
    res.status(502).json({ error: err.message || 'AI playlist generation failed' });
  }
});

export default router;

