// backend/services/appleCharts.js
// Apple Marketing Tools RSS feed â€” free, keyless, no auth.
// Endpoint format: https://rss.marketingtools.apple.com/api/v2/{country}/music/most-played/{limit}/songs.json
// Updates daily. We cache for 6 hours to be polite and fast.

const BASE = 'https://rss.marketingtools.apple.com/api/v2';
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

const cache = new Map(); // key -> { at, data }

async function call(pathname) {
  const res = await fetch(BASE + pathname, {
    headers: {
      Accept: 'application/json',
      // Apple's feed is happy with any UA but is nicer with a real one
      'User-Agent': 'Sonara/2.0 (+https://sonara.app)',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Apple Charts ${res.status} â€” ${body.slice(0, 160)}`);
  }
  return res.json();
}

function normalizeTrack(entry, index) {
  if (!entry) return null;
  return {
    rank: index + 1,
    id: entry.id || null,
    title: entry.name || 'Unknown',
    artist: entry.artistName || 'Unknown Artist',
    // Apple returns 100Ã—100 artwork URLs. Bump the size by replacing the suffix.
    image: (entry.artworkUrl100 || '')
      .replace('100x100bb', '480x480bb')
      .replace('100x100', '480x480') || null,
    url: entry.url || null,
    genres: entry.genres?.map(g => g.name).filter(Boolean) || [],
    releaseDate: entry.releaseDate || null,
  };
}

/**
 * Fetch the top N songs chart for a country.
 * @param {string} country  ISO-3166 alpha-2 (e.g. "us", "ng", "gb")
 * @param {number} limit    max entries (Apple allows up to 100)
 */
export async function getTopChart(country, limit = 100) {
  const cc = (country || 'us').toLowerCase();
  const n = Math.min(Math.max(parseInt(limit, 10) || 100, 5), 100);
  const key = `${cc}:${n}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const json = await call(`/${cc}/music/most-played/${n}/songs.json`);
  const results = json?.feed?.results || [];

  const tracks = results.map(normalizeTrack).filter(Boolean);
  const data = {
    country: cc,
    updatedAt: json?.feed?.updated || null,
    tracks,
  };

  cache.set(key, { at: Date.now(), data });
  return data;
}

