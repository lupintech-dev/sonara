// backend/routes/radio.js
import { Router } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  getFeatured,
  getStationsByTag,
  getStationsByCountry,
  searchStations,
  getTopTags,
  getTopCountries,
  getStationById,
  registerClick,
} from '../services/radioBrowser.js';

const router = Router();

// GET /api/radio/featured?limit=30
router.get('/featured', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '30', 10), 60);
    const stations = await getFeatured(limit);
    res.json({ stations });
  } catch (err) {
    console.error('[radio] featured failed:', err.message);
    res.status(502).json({ error: 'Radio fetch failed', detail: err.message });
  }
});

// GET /api/radio/tag/:tag?limit=30
router.get('/tag/:tag', async (req, res) => {
  try {
    const tag = (req.params.tag || '').toString().trim();
    if (!tag) return res.json({ stations: [] });
    const limit = Math.min(parseInt(req.query.limit || '30', 10), 60);
    const stations = await getStationsByTag(tag, limit);
    res.json({ stations });
  } catch (err) {
    console.error('[radio] tag failed:', err.message);
    res.status(502).json({ error: 'Radio tag fetch failed', detail: err.message });
  }
});

// GET /api/radio/country/:code?limit=30
router.get('/country/:code', async (req, res) => {
  try {
    const code = (req.params.code || '').toString().trim();
    if (!code) return res.json({ stations: [] });
    const limit = Math.min(parseInt(req.query.limit || '30', 10), 60);
    const stations = await getStationsByCountry(code, limit);
    res.json({ stations });
  } catch (err) {
    console.error('[radio] country failed:', err.message);
    res.status(502).json({ error: 'Radio country fetch failed', detail: err.message });
  }
});

// GET /api/radio/search?q=...
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json({ stations: [] });
    const limit = Math.min(parseInt(req.query.limit || '30', 10), 60);
    const stations = await searchStations(q, limit);
    res.json({ stations });
  } catch (err) {
    console.error('[radio] search failed:', err.message);
    res.status(502).json({ error: 'Radio search failed', detail: err.message });
  }
});

// GET /api/radio/tags
router.get('/tags', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '30', 10), 60);
    const tags = await getTopTags(limit);
    res.json({ tags });
  } catch (err) {
    console.error('[radio] tags failed:', err.message);
    res.status(502).json({ error: 'Radio tags fetch failed', detail: err.message });
  }
});

// GET /api/radio/countries
router.get('/countries', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '40', 10), 100);
    const countries = await getTopCountries(limit);
    res.json({ countries });
  } catch (err) {
    console.error('[radio] countries failed:', err.message);
    res.status(502).json({ error: 'Radio countries fetch failed', detail: err.message });
  }
});

// GET /api/radio/click/:uuid  — best-effort click tracking
router.get('/click/:uuid', async (req, res) => {
  registerClick(req.params.uuid); // fire and forget
  res.json({ ok: true });
});

// GET /api/radio/stream/:uuid
//   Proxies the station's live stream through our origin so:
//     1. CORS issues on the station don't matter
//     2. HTTP-only streams work even when the app runs on HTTPS (mixed content)
//     3. We can register the click server-side
router.get('/stream/:uuid', async (req, res) => {
  const { uuid } = req.params;
  const controller = new AbortController();
  const onClose = () => { try { controller.abort(); } catch {} };
  req.on('close', onClose);
  res.on('close', onClose);

  try {
    const station = await getStationById(uuid);
    if (!station || !station.url) {
      if (!res.headersSent) {
        return res.status(404).json({ error: 'Station not found or has no stream URL' });
      }
      return res.end();
    }

    // Register the click — non-blocking, improves Radio Browser ranking
    registerClick(uuid);

    const upstream = await fetch(station.url, {
      headers: {
        // Some stations reject requests without a browser-ish UA
        'User-Agent': 'Mozilla/5.0 (Sonara)',
        'Accept': '*/*',
        ...(req.headers.range ? { Range: req.headers.range } : {}),
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!res.headersSent) {
      res.status(upstream.status);
      const ct = upstream.headers.get('content-type');
      if (ct) res.set('content-type', ct);
      else res.set('content-type', 'audio/mpeg');
      const cl = upstream.headers.get('content-length');
      if (cl) res.set('content-length', cl);
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'no-store');
    }

    if (!upstream.body) return res.end();
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch (err) {
    const msg = err?.message || '';
    const isAbort =
      err?.name === 'AbortError' ||
      msg.includes('premature close') ||
      msg.includes('aborted') ||
      msg.includes('ECONNRESET') ||
      err?.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
      err?.code === 'ERR_HTTP2_STREAM_ERROR';

    if (!isAbort) console.error('[radio] stream failed:', msg);

    if (!res.headersSent) {
      res.status(502).json({ error: 'Radio stream failed' });
    } else if (!res.writableEnded) {
      try { res.end(); } catch {}
    }
  } finally {
    req.off('close', onClose);
    res.off('close', onClose);
  }
});

export default router;