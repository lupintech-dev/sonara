// frontend/src/api/localTracks.js
export async function getRecentLocalTracks(limit = 12) {
  const res = await fetch(`/api/local-tracks/recent?limit=${limit}`);
  if (!res.ok) throw new Error(`Recent local tracks failed (${res.status})`);
  const { tracks } = await res.json();
  return tracks || [];
}