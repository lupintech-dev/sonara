// frontend/src/utils/lrc.js
/**
 * Parse LRC format into [{ time: seconds, text: string }]
 * Supports:
 *   [mm:ss.xx] line
 *   [mm:ss.xxx] line
 *   [mm:ss] line
 *   multiple tags per line: [00:12.00][01:20.00] chorus
 */
export function parseLrc(lrc) {
  if (!lrc) return [];
  const out = [];
  const tagRegex = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

  for (const raw of lrc.split(/\r?\n/)) {
    const text = raw.trim();
    if (!text) continue;

    // Skip metadata tags like [ar:Artist], [ti:Title] etc.
    if (/^\[[a-zA-Z]+:/.test(text)) continue;

    tagRegex.lastIndex = 0;
    const times = [];
    let m;
    while ((m = tagRegex.exec(text)) !== null) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const frac = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      times.push(min * 60 + sec + frac / 1000);
    }

    const content = text.replace(tagRegex, '').trim();
    if (times.length === 0) {
      // Untimed line — treat as placeholder (rare, but keep it)
      if (content) out.push({ time: null, text: content });
    } else {
      for (const t of times) {
        out.push({ time: t, text: content || '♪' });
      }
    }
  }

  return out.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
}

/** Return the index of the line active at `currentTime`, or -1. */
export function activeLineIndex(lines, currentTime) {
  if (!lines?.length) return -1;
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].time;
    if (t == null) continue;
    if (t <= currentTime) idx = i;
    else break;
  }
  return idx;
}