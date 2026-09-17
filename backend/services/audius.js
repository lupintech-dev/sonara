// backend/services/audius.js
const BASE = 'https://discoveryprovider.audius.co/v1';
const APP_NAME = process.env.AUDIUS_APP_NAME || 'Sonara';

async function call(pathname, params = {}) {
  const url = new URL(BASE + pathname);
  url.searchParams.set('app_name', APP_NAME);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Audius ${res.status} ${res.statusText} â€” ${body.slice(0, 200)}`);
  }
  return res.json();
}

function normalizeTrack(t) {
  if (!t) return null;
  return {
    id: `audius:${t.id}`,
    source: 'audius',
    sourceId: t.id,
    title: t.title,
    duration: t.duration || 0,
    image: t.artwork?.['480x480'] || t.artwork?.['150x150'] || null,
    // Unified audio endpoint â€” never expose the raw Audius URL to the client
    audio: `/api/audio/audius/${t.id}`,
    genre: t.genre || null,
    mood: t.mood || null,
    playCount: t.play_count || 0,
    artist: {
      id: t.user?.id || null,
      name: t.user?.name || t.user?.handle || 'Unknown Artist',
      handle: t.user?.handle || null,
      image:
        t.user?.profile_picture?.['480x480'] ||
        t.user?.profile_picture?.['150x150'] ||
        null,
    },
  };
}

function normalizeArtist(u) {
  if (!u) return null;
  return {
    id: u.id,
    source: 'audius',
    name: u.name || u.handle,
    handle: u.handle,
    image: u.profile_picture?.['480x480'] || u.profile_picture?.['150x150'] || null,
    bio: u.bio || null,
    followerCount: u.follower_count || 0,
    trackCount: u.track_count || 0,
    verified: !!u.is_verified,
  };
}

export async function searchTracks(query, limit = 20) {
  const { data } = await call('/tracks/search', { query, limit });
  return (data || []).map(normalizeTrack).filter(Boolean);
}

export async function getTrackById(id) {
  const { data } = await call(`/tracks/${id}`);
  return normalizeTrack(data);
}

export async function getPopularTracks(limit = 20, genre = null) {
  const { data } = await call('/tracks/trending', { limit, genre });
  return (data || []).map(normalizeTrack).filter(Boolean);
}

export async function getArtistById(id) {
  const { data } = await call(`/users/${id}`);
  return normalizeArtist(data);
}

export async function getArtistTracks(id, limit = 25) {
  const { data } = await call(`/users/${id}/tracks`, { limit });
  return (data || []).map(normalizeTrack).filter(Boolean);
}

/** Raw upstream URL â€” only used by trackResolver, never sent to the client. */
export async function getStreamUrl(id) {
  return `${BASE}/tracks/${id}/stream?app_name=${encodeURIComponent(APP_NAME)}`;
}


