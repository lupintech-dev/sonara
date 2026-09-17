// backend/services/trackResolver.js
import { query, queryOne, execute } from '../db/turso.js';
import { getStreamUrl as getAudiusStreamUrl } from './audius.js';
import { getStreamUrl as getJamendoStreamUrl } from './jamendo.js';

const TTL_MS = 1000 * 60 * 60 * 4;        // 4 hours
const BACKOFF_AFTER_FAILS = 3;
const BACKOFF_MS = 1000 * 60 * 30;         // 30 minutes

async function getCacheRow(source, sourceId) {
  return (await queryOne('SELECT audio_url, resolved_at, fail_count, last_fail_at FROM audio_cache WHERE source = ? AND source_id = ?', [source, sourceId]));
}

async function upsertCache(source, sourceId, audioUrl) {
  (await execute(`
    INSERT INTO audio_cache (source, source_id, audio_url, resolved_at, fail_count, last_fail_at)
    VALUES (?, ?, ?, datetime('now'), 0, NULL)
    ON CONFLICT(source, source_id)
    DO UPDATE SET audio_url = excluded.audio_url,
                  resolved_at = excluded.resolved_at,
                  fail_count = 0,
                  last_fail_at = NULL
  `, [source, sourceId, audioUrl]));
}

async function markFailure(source, sourceId) {
  (await execute(`
    INSERT INTO audio_cache (source, source_id, audio_url, resolved_at, fail_count, last_fail_at)
    VALUES (?, ?, '', datetime('now'), 1, datetime('now'))
    ON CONFLICT(source, source_id)
    DO UPDATE SET fail_count = fail_count + 1,
                  last_fail_at = datetime('now')
  `, [source, sourceId]));
}

/** Called by the audio route when the resolved URL 404s upstream.
 *  Wipes the cache entry so the next request re-resolves from the source API. */
export async function clearAudioCache(source, sourceId) {
  (await execute('DELETE FROM audio_cache WHERE source = ? AND source_id = ?', [source, sourceId]));
}

export async function resolveAudioUrl(source, sourceId) {
  if (source === 'local') {
    const row = (await queryOne('SELECT audio_path FROM tracks WHERE id = ?', [parseInt(sourceId, 10)]));
    return row?.audio_path || null;
  }

  const cached = getCacheRow(source, sourceId);
  const now = Date.now();

  if (cached && cached.audio_url && cached.resolved_at) {
    const age = now - new Date(cached.resolved_at + 'Z').getTime();
    if (age < TTL_MS) return cached.audio_url;
  }

  if (cached && cached.fail_count >= BACKOFF_AFTER_FAILS && cached.last_fail_at) {
    const since = now - new Date(cached.last_fail_at + 'Z').getTime();
    if (since < BACKOFF_MS) return null;
  }

  let freshUrl = null;
  try {
    if (source === 'audius')  freshUrl = await getAudiusStreamUrl(sourceId);
    else if (source === 'jamendo') freshUrl = await getJamendoStreamUrl(sourceId);
  } catch (err) {
    console.warn(`[resolver] ${source}:${sourceId} threw:`, err.message);
    markFailure(source, sourceId);
    return null;
  }

  if (!freshUrl) {
    markFailure(source, sourceId);
    return null;
  }

  upsertCache(source, sourceId, freshUrl);
  return freshUrl;
}