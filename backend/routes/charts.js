// backend/routes/charts.js
import { Router } from 'express';
import { getTopChart } from '../services/appleCharts.js';

const router = Router();

// GET /api/charts/top/:country?limit=100
//   Free, keyless Apple Music daily top charts.
router.get('/top/:country', async (req, res) => {
  try {
    const country = (req.params.country || 'us').toLowerCase();
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 100);
    const data = await getTopChart(country, limit);
    res.set('Cache-Control', 'public, max-age=1800'); // 30 min at the CDN level
    res.json(data);
  } catch (err) {
    console.error('[charts] failed:', err.message);
    res.status(502).json({ error: 'Chart fetch failed', detail: err.message });
  }
});

// GET /api/charts/multi?countries=us,gb,ng,za,ke
//   Fetch multiple charts in one call — used by the Home shelves.
router.get('/multi', async (req, res) => {
  try {
    const raw = (req.query.countries || 'us').toString();
    const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).slice(0, 10);
    const limit = Math.min(parseInt(req.query.limit || '25', 10), 100);

    const results = await Promise.all(
      list.map(c => getTopChart(c, limit).catch(err => ({ country: c, error: err.message, tracks: [] })))
    );

    res.set('Cache-Control', 'public, max-age=1800');
    res.json({
      charts: results.map(r => ({
        country: r.country,
        updatedAt: r.updatedAt,
        preview: (r.tracks || []).slice(0, 5), // just 5 for the shelf card
        trackCount: (r.tracks || []).length,
      })),
    });
  } catch (err) {
    console.error('[charts] multi failed:', err.message);
    res.status(502).json({ error: 'Charts fetch failed', detail: err.message });
  }
});

export default router;