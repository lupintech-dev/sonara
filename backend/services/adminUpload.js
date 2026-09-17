// backend/services/adminUpload.js
import { query, queryOne, execute } from '../db/turso.js';
import { parseBuffer } from 'music-metadata';

const MIME_BY_EXT = {
  '.mp3':  'audio/mpeg',
  '.m4a':  'audio/mp4',
  '.wav':  'audio/wav',
  '.ogg':  'audio/ogg',
  '.flac': 'audio/flac',
  '.aac':  'audio/aac',
  '.opus': 'audio/opus',
  '.webm': 'audio/webm',
};

const IMG_EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg':  '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  'image/gif':  '.gif',
};

// Whitespace-wrapped dash (safest split)
const SPACED_DASH_RE = /\s+[-–—－]\s+/;

// Any separator after an artist prefix
const PREFIX_SEP_RE = /^[\s\-–—－:|._]+/;

/**
 * Try to split an "Artist - Title" / "Artist - Album - Title" string.
 * Uses whitespace-wrapped dashes only (safe).
 */
export function splitArtistTitle(raw) {
  if (!raw) return { artist: null, album: null, title: null };
  const parts = String(raw).split(SPACED_DASH_RE).map(s => s.trim()).filter(Boolean);

  if (parts.length >= 3) {
    return {
      artist: parts[0],
      album: parts[1],
      title: parts.slice(2).join(' - '),
    };
  }
  if (parts.length === 2) {
    return { artist: parts[0], album: null, title: parts[1] };
  }
  return { artist: null, album: null, title: raw.trim() };
}

/**
 * Given an artist name and a title, strip the artist prefix from the title if present.
 * Handles:
 *   "6uff-The-Truth"     → "The-Truth"     (artist="6uff")
 *   "6uff - The Truth"   → "The Truth"
 *   "6uff: The Truth"    → "The Truth"
 *   "6uff | The Truth"   → "The Truth"
 *   "The 6uff Truth"     → unchanged       (doesn't start with artist)
 */
export function stripArtistPrefixFromTitle(title, artist) {
  if (!title || !artist) return title;
  const a = String(artist).trim().toLowerCase();
  const t = String(title).trim();
  if (!a || !t) return title;

  const lowerT = t.toLowerCase();
  if (!lowerT.startsWith(a)) return title;

  // Text right after the artist name
  const rest = t.slice(artist.trim().length);

  // Must start with a separator character (with optional spaces)
  const m = rest.match(PREFIX_SEP_RE);
  if (!m) return title;

  const stripped = rest.slice(m[0].length).trim();
  if (!stripped) return title; // would leave an empty title
  return stripped;
}

/**
 * Read embedded metadata (title, artist, album, duration, cover art) from
 * an audio buffer. Returns null if the buffer can't be parsed.
 */
export async function readAudioMetadata(buffer, filename = '') {
  const ext = (filename.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
  const mimeType = MIME_BY_EXT[ext] || undefined;

  let meta;
  try {
    meta = await parseBuffer(buffer, mimeType, { duration: true });
  } catch (err) {
    console.warn('[metadata] parse failed for', filename, '—', err.message);
    return null;
  }

  const common = meta?.common || {};
  const format = meta?.format || {};

  let cover = null;
  const pics = common.picture || [];
  if (pics.length > 0) {
    const front = pics.find(p => String(p.type || '').toLowerCase().includes('front')) || pics[0];
    if (front?.data && front.data.length > 0) {
      const ext = IMG_EXT_BY_MIME[front.format?.toLowerCase()] || '.jpg';
      cover = {
        data: Buffer.isBuffer(front.data) ? front.data : Buffer.from(front.data),
        ext,
      };
    }
  }

  return {
    title: common.title || null,
    artist: common.artist || (common.artists && common.artists[0]) || null,
    album: common.album || null,
    duration: format.duration ? Math.round(format.duration) : null,
    cover,
  };
}

/**
 * Parse an archive entry name into { artist, album, title }.
 * Handles whitespace-wrapped dashes and folder structure.
 */
export function parseEntryName(entryName) {
  const clean = String(entryName).replace(/\\/g, '/');
  const segments = clean.split('/').filter(Boolean);
  if (!segments.length) return null;

  const fileName = segments[segments.length - 1];
  if (fileName.startsWith('.')) return null;
  if (!/\.(mp3|m4a|wav|ogg|flac|aac|opus|webm)$/i.test(fileName)) return null;

  let baseName = fileName.replace(/\.[^.]+$/, '');

  let artist = null;
  let album = null;
  if (segments.length >= 3) {
    artist = segments[0];
    album = segments[segments.length - 2];
  } else if (segments.length === 2) {
    artist = segments[0];
  }

  // Strip leading track number
  baseName = baseName.replace(/^\s*\d{1,3}[\s._\-–—]+/, '').trim();

  const split = splitArtistTitle(baseName);
  let title = split.title || baseName;
  if (!artist && split.artist) artist = split.artist;
  if (!album && split.album) album = split.album;

  title = (title || baseName).trim().replace(/^[-–—\s]+|[-–—\s]+$/g, '');
  if (!title) return null;

  return { artist, album, title };
}

function slugifyArtist(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .slice(0, 24) || 'artist';
}

export async function ensureArtist(name) {
  const clean = (name || '').trim();
  if (!clean) return null;

  const byDisplay = (await queryOne('SELECT id FROM users WHERE LOWER(display_name) = LOWER(?) LIMIT 1', [clean]));
  if (byDisplay) return byDisplay.id;

  const slug = slugifyArtist(clean);
  const byUsername = (await queryOne('SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1', [slug]));
  if (byUsername) return byUsername.id;

  let candidate = slug;
  let suffix = 1;
  while ((await queryOne('SELECT id FROM users WHERE username = ?', [candidate]))) {
    candidate = `${slug}${suffix++}`;
  }

  const result = (await execute(`
    INSERT INTO users (username, display_name, is_verified_artist, is_managed_by_sonara)
    VALUES (?, ?, 1, 1)
  `, [candidate, clean]));

  return Number(result.lastInsertRowid);
}

export async function bulkCreateArtists(names) {
  const results = { created: [], existing: [], skipped: [] };
  const seen = new Set();

  for (const raw of names) {
    const name = String(raw || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) { results.skipped.push(name); continue; }
    seen.add(key);

    const existingBefore = (await queryOne('SELECT id FROM users WHERE LOWER(display_name) = LOWER(?) LIMIT 1', [name]));

    const id = ensureArtist(name);

    if (existingBefore) results.existing.push({ id, name });
    else results.created.push({ id, name });
  }

  return results;
}