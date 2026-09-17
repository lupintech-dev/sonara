// frontend/src/api/jamendo.js
// Talks to our own backend proxy at /api/jamendo (Vite proxies to :5000).

const base = '/api/jamendo';

async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Jamendo ${res.status}`);
  return res.json();
}

export async function searchJamendo(query, limit = 20) {
  if (!query?.trim()) return [];
  const { tracks } = await json(`${base}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  return tracks || [];
}

export async function getJamendoPopular(limit = 20, genre = null) {
  const g = genre ? `&genre=${encodeURIComponent(genre)}` : '';
  const { tracks } = await json(`${base}/popular?limit=${limit}${g}`);
  return tracks || [];
}

export async function getJamendoTrack(id) {
  const { track } = await json(`${base}/tracks/${id}`);
  return track;
}

export async function getJamendoArtist(id) {
  const { artist } = await json(`${base}/artists/${id}`);
  return artist;
}

export async function getJamendoArtistTracks(id, limit = 25) {
  const { tracks } = await json(`${base}/artists/${id}/tracks?limit=${limit}`);
  return tracks || [];
}