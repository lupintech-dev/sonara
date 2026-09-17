// backend/services/lyrics.js
// LRCLIB â€” free, open lyrics database with .lrc synced lyrics.
// Docs: https://lrclib.net/docs

const BASE = 'https://lrclib.net/api';
const UA = 'Sonara/2.0 (https://sonara.app)';

async function call(pathname, params = {}) {
  const url = new URL(BASE + pathname);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LRCLIB ${res.status} â€” ${body.slice(0, 120)}`);
  }
  return res.json();
}

async function normalize(hit) {
  if (!hit) return null;
  if (!hit.syncedLyrics && !hit.plainLyrics && !hit.instrumental) return null;
  return {
    syncedLyrics: hit.syncedLyrics || null,
    plainLyrics: hit.plainLyrics || null,
    instrumental: !!hit.instrumental,
    source: 'lrclib',
    trackName: hit.trackName,
    artistName: hit.artistName,
    albumName: hit.albumName,
    duration: hit.duration,
  };
}

// Version keywords we want to strip when searching for the canonical track
const VERSION_WORDS = [
  'remix', 'cover', 'edit', 'version', 'instrumental',
  'extended', 'radio edit', 'live', 'remaster', 'remastered',
  'acoustic', 'demo', 'mix', 'flip', 'bootleg', 'sped up',
  'slowed', 'reverb', 'rework', 'refix', 'bootleg',
];

/**
 * Remove "(...)" or "[...]" segments that contain a version keyword anywhere.
 * e.g. "This Love (Shavezz Remix)" â†’ "This Love"
 *      "Song [Official Audio]" â†’ "Song"
 *      "Song feat. X" â†’ "Song"
 */
function stripDescriptors(s) {
  if (!s) return s;

  // 1. Remove parenthesized/bracketed segments containing a version keyword
  //    anywhere inside, e.g. "(Shavezz Remix)" or "[Extended Mix]".
  const versionPattern = new RegExp(
    `\\s*[\\(\\[]\\s*[^\\)\\]]*\\b(?:${VERSION_WORDS.join('|')})\\b[^\\)\\]]*[\\)\\]]`,
    'gi'
  );
  let out = s.replace(versionPattern, '');

  // 2. Remove "feat./ft./with/prod." segments entirely
  out = out.replace(
    /\s*[\(\[]\s*(feat|ft|with|prod)\.?\s[^\)\]]*[\)\]]/gi,
    ''
  );

  // 3. Remove dash-suffix descriptors: "Song - Remix", "Song â€“ Extended Mix"
  const dashPattern = new RegExp(
    `\\s*[-â€“â€”]\\s*(?:${VERSION_WORDS.join('|')})\\b.*$`,
    'i'
  );
  out = out.replace(dashPattern, '');

  // 4. Collapse double spaces and trim
  return out.replace(/\s{2,}/g, ' ').trim();
}

function norm(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitArtistSong(title) {
  if (!title) return null;
  const m = title.match(/^(.+?)\s+[-â€“â€”]\s+(.+)$/);
  if (m) return { left: m[1].trim(), right: m[2].trim() };
  return null;
}

async function tryExact({ artist, title, album, duration }) {
  if (!artist || !title) return null;
  const hit = await call('/get', {
    artist_name: artist,
    track_name: title,
    album_name: album,
    duration,
  }).catch(() => null);
  return normalize(hit);
}

async function rankCandidates(candidates, duration) {
  return candidates.sort((a, b) => {
    // Prefer synced
    const aSync = a.syncedLyrics ? 0 : 1;
    const bSync = b.syncedLyrics ? 0 : 1;
    if (aSync !== bSync) return aSync - bSync;
    // Then closest duration
    if (duration) {
      return Math.abs((a.duration || 0) - duration) -
             Math.abs((b.duration || 0) - duration);
    }
    return 0;
  })[0];
}

async function trySearch({ artist, title, duration }) {
  if (!artist || !title) return null;
  const results = await call('/search', {
    artist_name: artist,
    track_name: title,
  }).catch(() => []);
  if (!Array.isArray(results) || results.length === 0) return null;
  const candidates = results.map(normalize).filter(Boolean);
  if (candidates.length === 0) return null;
  return rankCandidates(candidates, duration);
}

async function tryQSearch(q) {
  if (!q) return null;
  const results = await call('/search', { q }).catch(() => []);
  if (!Array.isArray(results) || results.length === 0) return null;
  const candidates = results.map(normalize).filter(Boolean);
  if (candidates.length === 0) return null;
  return rankCandidates(candidates, null);
}

function buildAttempts({ artist, title, album, duration }) {
  const attempts = [];
  const cleanTitle = stripDescriptors(title);
  const split = splitArtistSong(title);
  const cleanSplitRight = split ? stripDescriptors(split.right) : null;
  const cleanSplitLeft  = split ? stripDescriptors(split.left)  : null;

  // 1. As-is
  if (artist) attempts.push({ artist, title, duration });

  // 2. Artist + cleaned title
  if (artist && cleanTitle && cleanTitle !== title) {
    attempts.push({ artist, title: cleanTitle, duration });
  }

  // 3. Split title "A - B" â†’ try B with artist A
  if (split && cleanSplitRight && cleanSplitRight !== title) {
    attempts.push({ artist: split.left, title: cleanSplitRight, duration });
    if (cleanSplitLeft && cleanSplitLeft !== split.left) {
      attempts.push({ artist: cleanSplitLeft, title: cleanSplitRight, duration });
    }
    // No duration â€” critical for remixes/covers where length differs
    attempts.push({ artist: split.left, title: cleanSplitRight, duration: undefined });
  }

  // 4. Artist + cleaned title, no duration
  if (artist && cleanTitle) {
    attempts.push({ artist, title: cleanTitle, duration: undefined });
  }

  // Deduplicate
  const seen = new Set();
  return attempts.filter(a => {
    if (!a.artist || !a.title) return false;
    const key = `${norm(a.artist)}|${norm(a.title)}|${a.duration || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildQQueries({ artist, title }) {
  const cleanTitle = stripDescriptors(title);
  const split = splitArtistSong(title);
  const qs = [];

  if (split) {
    const cleanSplitRight = stripDescriptors(split.right);
    if (cleanSplitRight) {
      qs.push(`${split.left} ${cleanSplitRight}`);
    }
  }
  if (cleanTitle) qs.push(cleanTitle);
  if (artist && cleanTitle) qs.push(`${artist} ${cleanTitle}`);
  if (title) qs.push(title);

  const seen = new Set();
  return qs.filter(q => {
    const k = q.toLowerCase().trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function getLyrics({ artist, title, album, duration }) {
  if (!title) return null;
  const attempts = buildAttempts({ artist, title, album, duration });

  // Phase 1: exact /get with each attempt
  for (const attempt of attempts) {
    try {
      const hit = await tryExact(attempt);
      if (hit) return hit;
    } catch (err) {
      console.warn('[lyrics] exact failed:', err.message);
    }
  }

  // Phase 2: structured /search
  for (const attempt of attempts) {
    try {
      const hit = await trySearch(attempt);
      if (hit) return hit;
    } catch (err) {
      console.warn('[lyrics] search failed:', err.message);
    }
  }

  // Phase 3: free-text /search?q=...
  for (const q of buildQQueries({ artist, title })) {
    try {
      const hit = await tryQSearch(q);
      if (hit) return hit;
    } catch (err) {
      console.warn('[lyrics] q-search failed:', err.message);
    }
  }

  return null;
}

export async function debugLyrics({ artist, title, album, duration }) {
  const attempts = buildAttempts({ artist, title, album, duration });
  const qs = buildQQueries({ artist, title });
  const trace = [];
  let hit = null;

  for (const attempt of attempts) {
    let r = null, e = null;
    try { r = await tryExact(attempt); } catch (err) { e = err.message; }
    trace.push({ phase: 'exact', attempt, hit: !!r, error: e });
    if (r) { hit = r; break; }
  }

  if (!hit) for (const attempt of attempts) {
    let r = null, e = null;
    try { r = await trySearch(attempt); } catch (err) { e = err.message; }
    trace.push({ phase: 'search', attempt, hit: !!r, error: e });
    if (r) { hit = r; break; }
  }

  if (!hit) for (const q of qs) {
    let r = null, e = null;
    try { r = await tryQSearch(q); } catch (err) { e = err.message; }
    trace.push({ phase: 'q', q, hit: !!r, error: e });
    if (r) { hit = r; break; }
  }

  return {
    input: { artist, title, album, duration },
    cleaned: {
      stripDescriptors: stripDescriptors(title),
      split: splitArtistSong(title),
    },
    attemptsTried: attempts.length,
    qQueries: qs,
    trace,
    lyrics: hit,
  };
}


