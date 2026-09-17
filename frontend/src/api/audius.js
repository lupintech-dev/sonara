// frontend/src/api/audius.js
// Talks to our own backend proxy at /api/audius (Vite proxies to :5000).

const base = '/api/audius';

async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Audius ${res.status}`);
  return res.json();
}

export async function searchAudius(query, limit = 20) {
  if (!query?.trim()) return [];
  const { tracks } = await json(`${base}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  return tracks || [];
}

export async function getAudiusPopular(limit = 20, genre = null) {
  const g = genre ? `&genre=${encodeURIComponent(genre)}` : '';
  const { tracks } = await json(`${base}/popular?limit=${limit}${g}`);
  return tracks || [];
}

export async function getAudiusTrack(id) {
  const { track } = await json(`${base}/tracks/${id}`);
  return track;
}

export async function getAudiusArtist(id) {
  const { artist } = await json(`${base}/artists/${id}`);
  return artist;
}

export async function getAudiusArtistTracks(id, limit = 25) {
  const { tracks } = await json(`${base}/artists/${id}/tracks?limit=${limit}`);
  return tracks || [];
}