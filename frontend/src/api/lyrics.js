// frontend/src/api/lyrics.js
export async function fetchLyrics({ artist, title, album, duration }, { debug = false } = {}) {
  if (!artist || !title) return null;
  const params = new URLSearchParams({
    artist,
    title,
    ...(album ? { album } : {}),
    ...(duration ? { duration: String(Math.round(duration)) } : {}),
    ...(debug ? { debug: '1' } : {}),
  });

  const res = await fetch(`/api/lyrics?${params}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Lyrics request failed (${res.status})`);
  }

  const data = await res.json();
  return debug ? data : data.lyrics;
}