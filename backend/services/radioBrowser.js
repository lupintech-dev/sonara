// backend/services/radioBrowser.js
// Radio Browser â€” free, community-driven directory of internet radio stations.
// Docs: https://docs.radio-browser.info/
//
// No API key required. ~50,000 stations. We cache aggressively (their
// guidelines ask for 5-15 min) and use the round-robin DNS mirror pool
// (all.api.radio-browser.info) so a single mirror outage doesn't kill us.

const BASE = 'https://all.api.radio-browser.info/json';
const UA = 'Sonara/2.0 (+https://sonara.app)';

const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes
const cache = new Map();              // key -> { at, data }

async function call(pathname, params = {}) {
  const url = new URL(BASE + pathname);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`RadioBrowser ${res.status} â€” ${body.slice(0, 160)}`);
  }
  return res.json();
}

async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return Promise.resolve(hit.data);
  return fn().then(data => {
    cache.set(key, { at: Date.now(), data });
    return data;
  });
}

/** Normalize a Radio Browser station into a lightweight shape for the app. */
function normalizeStation(s) {
  if (!s) return null;
  const tags = (s.tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 6);

  return {
    id: s.stationuuid,
    name: s.name?.trim() || 'Unknown Station',
    url: s.url_resolved || s.url || null,
    homepage: s.homepage || null,
    favicon: s.favicon || null,
    country: s.country || null,
    countryCode: s.countrycode || null,
    state: s.state || null,
    language: s.language || null,
    tags,
    votes: s.votes || 0,
    clickCount: s.clickcount || 0,
    clickTrend: s.clicktrend || 0,
    codec: s.codec || null,
    bitrate: s.bitrate || 0,
    hls: !!s.hls,
    lastCheckOk: !!s.lastcheckok,
  };
}

/* ---------------- Public API ---------------- */

/** Top-voted stations overall (featured). */
export async function getFeatured(limit = 30) {
  return cached(`featured:${limit}`, async () => {
    const rows = await call('/stations/search', {
      hidebroken: 'true',
      order: 'votes',
      reverse: 'true',
      limit,
    });
    return rows.map(normalizeStation).filter(Boolean);
  });
}

/** Stations by tag (genre). */
export async function getStationsByTag(tag, limit = 30) {
  return cached(`tag:${tag}:${limit}`, async () => {
    const rows = await call('/stations/search', {
      tag,
      hidebroken: 'true',
      order: 'votes',
      reverse: 'true',
      limit,
    });
    return rows.map(normalizeStation).filter(Boolean);
  });
}

/** Stations by country code (e.g. "NG", "US"). */
export async function getStationsByCountry(countryCode, limit = 30) {
  return cached(`country:${countryCode}:${limit}`, async () => {
    const rows = await call('/stations/search', {
      countrycode: countryCode,
      hidebroken: 'true',
      order: 'votes',
      reverse: 'true',
      limit,
    });
    return rows.map(normalizeStation).filter(Boolean);
  });
}

/** Free-text search by name. */
export async function searchStations(query, limit = 30) {
  if (!query?.trim()) return [];
  return cached(`search:${query}:${limit}`, async () => {
    const rows = await call('/stations/search', {
      name: query,
      hidebroken: 'true',
      order: 'votes',
      reverse: 'true',
      limit,
    });
    return rows.map(normalizeStation).filter(Boolean);
  });
}

/** Top tags with station counts â€” used for genre chips. */
export async function getTopTags(limit = 30) {
  return cached(`tags:${limit}`, async () => {
    const rows = await call('/tags', {
      order: 'stationcount',
      reverse: 'true',
      limit,
    });
    return (rows || []).map(t => ({
      name: t.name,
      stationCount: t.stationcount || 0,
    }));
  });
}

/** Top countries with station counts â€” used for country filter. */
export async function getTopCountries(limit = 40) {
  return cached(`countries:${limit}`, async () => {
    const rows = await call('/countries', {
      order: 'stationcount',
      reverse: 'true',
      limit,
    });
    return (rows || []).map(c => ({
      name: c.name,
      code: c.iso_3166_1 || null,
      stationCount: c.stationcount || 0,
    }));
  });
}

/** Look up a single station by UUID â€” used by the stream proxy. */
export async function getStationById(uuid) {
  // Always fresh, no cache, because the URL may have rotated
  const rows = await call(`/stations/byuuid/${encodeURIComponent(uuid)}`);
  const arr = Array.isArray(rows) ? rows : [];
  return normalizeStation(arr[0]);
}

/** Notify Radio Browser that a station was played â€” improves their ranking. */
export async function registerClick(uuid) {
  try {
    await call(`/url/${encodeURIComponent(uuid)}`);
  } catch {
    // Non-fatal â€” the app never waits on this
  }
}

