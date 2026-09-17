// backend/routes/audio.js
import { Router } from 'express';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { resolveAudioUrl, clearAudioCache } from '../services/trackResolver.js';

const router = Router();

router.get('/:source/:sourceId', async (req, res) => {
  const { source, sourceId } = req.params;

  const controller = new AbortController();
  const onClose = () => { try { controller.abort(); } catch {} };
  req.on('close', onClose);
  res.on('close', onClose);

  try {
    const realUrl = await resolveAudioUrl(source, sourceId);

    if (!realUrl) {
      res.set('Cache-Control', 'no-store');
      return res.status(404).json({
        error: 'Audio unavailable',
        source,
        sourceId,
      });
    }

    // Local files served by /uploads static
    if (realUrl.startsWith('/uploads/')) {
      return res.redirect(307, realUrl);
    }

    const headers = {};
    if (req.headers.range) headers.Range = req.headers.range;

    const upstream = await fetch(realUrl, {
      headers,
      signal: controller.signal,
    });

    // If the cached URL went stale, wipe it so the next attempt re-resolves
    if (upstream.status === 404 || upstream.status === 410) {
      console.warn(`[audio] stale URL for ${source}:${sourceId} (HTTP ${upstream.status}) — clearing cache`);
      clearAudioCache(source, sourceId);
      if (!res.headersSent) {
        return res.status(upstream.status).json({
          error: 'Upstream audio unavailable',
          source,
          sourceId,
        });
      }
      return res.end();
    }

    if (!res.headersSent) {
      res.status(upstream.status);
      for (const h of ['content-type', 'content-length', 'accept-ranges', 'content-range']) {
        const v = upstream.headers.get(h);
        if (v) res.set(h, v);
      }
      if (!res.get('content-type')) res.set('content-type', 'audio/mpeg');
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'public, max-age=3600');
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

    if (!isAbort) console.error('[audio] stream failed:', msg);

    if (!res.headersSent) {
      res.status(502).json({ error: 'Audio stream failed' });
    } else if (!res.writableEnded) {
      try { res.end(); } catch {}
    }
  } finally {
    req.off('close', onClose);
    res.off('close', onClose);
  }
});

export default router;