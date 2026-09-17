// backend/services/jamendo.js
const BASE = 'https://api.jamendo.com/v3.0';
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID || '';

async function call(pathname, params = {}) {
  if (!CLIENT_ID) throw new Error('JAMENDO_CLIENT_ID is not set');

  const url = new URL(BASE + pathname);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('format', 'json');
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const bodyText = await res.text();

  if (!res.ok) {
    throw new Error(`Jamendo HTTP ${res.status} â€” ${bodyText.slice(0, 200)}`);
  }

  let json;
  try {
    json = JSON.parse(bodyText);
  } catch (e) {
    throw new Error(`Jamendo returned non-JSON: ${bodyText.slice(0, 200)}`);
  }

  const h = json?.headers || {};
  if (h.status && h.status !== 'success') {
    throw new Error(`Jamendo: ${h.status} â€” ${h.error_message || ''}`);
  }
  return json;
}

function normalizeTrack(t) {
  if (!t) return null;
  return {
    id: `jamendo:${t.id}`,
    source: 'jamendo',
    sourceId: String(t.id),
    title: t.name,
    duration: t.duration || 0,
    image: t.image || t.album_image || null,
    // Unified audio endpoint
    audio: `/api/audio/jamendo/${t.id}`,
    album: t.album_id ? {
      id: t.album_id,
      name: t.album_name || null,
      image: t.album_image || null,
    } : null,
    genre: t.musicinfo?.tags?.genres?.[0] || null,
    playCount: null,
    releaseDate: t.releasedate || null,
    license: t.license_ccurl || null,
    artist: {
      id: t.artist_id,
      name: t.artist_name || 'Unknown Artist',
      handle: t.artist_idstr || null,
      image: null,
    },
  };
}

function normalizeArtist(a) {
  if (!a) return null;
  return {
    id: a.id,
    source: 'jamendo',
    name: a.name,
    handle: a.shorturl?.replace(/^\//, '') || null,
    image: a.image || null,
    bio: null,
    followerCount: 0,
    trackCount: 0,
    verified: false,
    website: a.website || null,
    joined: a.joindate || null,
  };
}

export async function searchTracks(query, limit = 20) {
  if (!query?.trim()) return [];
  const json = await call('/tracks/', {
    search: query,
    limit,
    audioformat: 'mp32',
  });
  return (json.results || []).map(normalizeTrack).filter(Boolean);
}

export async function getTrackById(id) {
  const json = await call('/tracks/', { id, limit: 1, audioformat: 'mp32' });
  return normalizeTrack(json.results?.[0]);
}

export async function getPopularTracks(limit = 20, genre = null) {
  const params = {
    limit,
    audioformat: 'mp32',
  };
  if (genre) params.tags = String(genre).toLowerCase();
  const json = await call('/tracks/', params);
  return (json.results || []).map(normalizeTrack).filter(Boolean);
}

export async function getArtistById(id) {
  const json = await call('/artists/', { id, limit: 1 });
  return normalizeArtist(json.results?.[0]);
}

export async function getArtistTracks(id, limit = 25) {
  const json = await call('/tracks/', {
    artist_id: id,
    limit,
    audioformat: 'mp32',
  });
  return (json.results || []).map(normalizeTrack).filter(Boolean);
}

/** Raw upstream URL â€” only used by trackResolver, never sent to the client. */
export async function getStreamUrl(id) {
  const json = await call('/tracks/', { id, limit: 1, audioformat: 'mp32' });
  return json.results?.[0]?.audio || null;
}


