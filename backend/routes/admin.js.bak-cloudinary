// backend/routes/admin.js
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import { query, queryOne, execute } from '../db/turso.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  parseEntryName, ensureArtist, bulkCreateArtists,
  readAudioMetadata, splitArtistTitle, stripArtistPrefixFromTitle,
} from '../services/adminUpload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, '..', 'uploads', 'audio');
const IMAGE_DIR = path.join(__dirname, '..', 'uploads', 'images');
const TEMP_DIR  = path.join(__dirname, '..', 'uploads', 'tmp');
fs.mkdirSync(AUDIO_DIR, { recursive: true });
fs.mkdirSync(IMAGE_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

const ALLOWED_AUDIO = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.opus', '.webm'];
const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const audioImageStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === 'audio') cb(null, AUDIO_DIR);
    else cb(null, IMAGE_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = file.fieldname === 'audio'
      ? (ALLOWED_AUDIO.includes(ext) ? ext : '.mp3')
      : (ALLOWED_IMAGE.includes(ext) ? ext : '.jpg');
    cb(null, `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safe}`);
  },
});

const uploadSingle = multer({
  storage: audioImageStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'audio' && !file.mimetype.startsWith('audio/')) {
      return cb(new Error('audio field must be an audio file'));
    }
    if (file.fieldname === 'image' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('image field must be an image'));
    }
    cb(null, true);
  },
}).fields([{ name: 'audio', maxCount: 1 }, { name: 'image', maxCount: 1 }]);

const uploadZip = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, TEMP_DIR),
    filename: (_req, _file, cb) => cb(null, `zip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.zip`),
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/\.zip$/i.test(file.originalname)) return cb(new Error('Only .zip archives are allowed'));
    cb(null, true);
  },
}).single('zip');

function serializeTrack(row) {
  return {
    id: `local:${row.id}`,
    dbId: row.id,
    source: 'local',
    sourceId: String(row.id),
    title: row.title,
    duration: row.duration || 0,
    audio: row.audio_path,
    image: row.image_path,
    album: row.album_name ? {
      id: row.album_id, name: row.album_name, image: row.album_cover || null,
    } : null,
    artist: {
      id: row.artist_id,
      name: row.artist_display_name || row.artist_username || 'Unknown Artist',
      handle: row.artist_username || null,
      image: row.artist_avatar || null,
      managed: !!row.artist_managed,
    },
    createdAt: row.created_at,
  };
}

const TRACK_SELECT = `
  SELECT t.*,
         u.display_name AS artist_display_name,
         u.username     AS artist_username,
         u.avatar_path  AS artist_avatar,
         u.is_managed_by_sonara AS artist_managed,
         a.name         AS album_name,
         a.cover_path   AS album_cover
  FROM tracks t
  LEFT JOIN albums a ON a.id = t.album_id
  LEFT JOIN users  u ON u.id = t.artist_id
`;

async function createTrackRow({ title, artistId, albumId, duration, audioPath, imagePath }) {
  const r = (await execute(`
    INSERT INTO tracks (title, artist_id, album_id, duration, audio_path, image_path, source)
    VALUES (?, ?, ?, ?, ?, ?, 'local')
  `, [title, artistId, albumId || null, duration || null, audioPath, imagePath || null]));
  const trackId = Number(r.lastInsertRowid);
  (await execute('UPDATE tracks SET source_id = ? WHERE id = ?', [String(trackId), trackId]));
  return trackId;
}

async function getOrCreateAlbum(name, artistId, coverPath) {
  if (!name?.trim()) return null;
  const existing = (await queryOne(`SELECT id FROM albums WHERE artist_id = ? AND LOWER(name) = LOWER(?) LIMIT 1`, [artistId, name.trim()]));
  if (existing) {
    if (coverPath) {
      (await execute(`UPDATE albums SET cover_path = COALESCE(cover_path, ?) WHERE id = ?`, [coverPath, existing.id]));
    }
    return existing.id;
  }
  const r = (await execute(`INSERT INTO albums (name, artist_id, cover_path) VALUES (?, ?, ?)`, [name.trim(), artistId, coverPath || null]));
  return Number(r.lastInsertRowid);
}

function saveCoverBuffer(buffer, ext) {
  const safeExt = ['.jpg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
  const filename = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
  fs.writeFileSync(path.join(IMAGE_DIR, filename), buffer);
  return `/uploads/images/${filename}`;
}

const router = Router();

/* ---------- Dashboard ---------- */

router.get('/stats', requireAdmin, async (_req, res) => {
  const totalUsers   = (await queryOne('SELECT COUNT(*) AS c FROM users', [])).c;
  const artists      = (await queryOne('SELECT COUNT(*) AS c FROM users WHERE is_verified_artist = 1', [])).c;
  const admins       = (await queryOne('SELECT COUNT(*) AS c FROM users WHERE is_admin = 1', [])).c;
  const localTracks  = (await queryOne(`SELECT COUNT(*) AS c FROM tracks WHERE source = 'local'`, [])).c;
  const playlists    = (await queryOne('SELECT COUNT(*) AS c FROM playlists', [])).c;
  const totalPlays   = (await queryOne('SELECT COUNT(*) AS c FROM listening_history', [])).c;
  const openMessages = (await queryOne(`SELECT COUNT(*) AS c FROM artist_messages WHERE status = 'open'`, [])).c;

  res.json({
    stats: { totalUsers, artists, admins, localTracks, playlists, totalPlays, openMessages },
  });
});

/* ---------- Users ---------- */

router.get('/users', requireAdmin, async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

  const rows = q
    ? (await query(`
        SELECT id, username, email, display_name, avatar_path,
               is_verified_artist, is_admin, is_managed_by_sonara, created_at
        FROM users
        WHERE username LIKE ? OR display_name LIKE ? OR email LIKE ?
        ORDER BY created_at DESC LIMIT ?
      `, [`%${q}%`, `%${q}%`, `%${q}%`, limit]))
    : (await query(`
        SELECT id, username, email, display_name, avatar_path,
               is_verified_artist, is_admin, is_managed_by_sonara, created_at
        FROM users
        ORDER BY created_at DESC LIMIT ?
      `, [limit]));

  res.json({
    users: rows.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      displayName: u.display_name,
      avatarPath: u.avatar_path,
      isVerifiedArtist: !!u.is_verified_artist,
      isAdmin: !!u.is_admin,
      isManaged: !!u.is_managed_by_sonara,
      createdAt: u.created_at,
    })),
  });
});

router.post('/users/:id/verify-artist', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!(await queryOne('SELECT id FROM users WHERE id = ?', [id]))) {
    return res.status(404).json({ error: 'User not found' });
  }
  (await execute('UPDATE users SET is_verified_artist = 1 WHERE id = ?', [id]));
  res.json({ ok: true });
});

router.post('/users/:id/unverify-artist', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!(await queryOne('SELECT id FROM users WHERE id = ?', [id]))) {
    return res.status(404).json({ error: 'User not found' });
  }
  (await execute('UPDATE users SET is_verified_artist = 0 WHERE id = ?', [id]));
  res.json({ ok: true });
});

router.post('/users/:id/grant-admin', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!(await queryOne('SELECT id FROM users WHERE id = ?', [id]))) {
    return res.status(404).json({ error: 'User not found' });
  }
  (await execute('UPDATE users SET is_admin = 1 WHERE id = ?', [id]));
  res.json({ ok: true });
});

router.post('/users/:id/revoke-admin', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) return res.status(400).json({ error: "You can't revoke your own admin" });
  if (!(await queryOne('SELECT id FROM users WHERE id = ?', [id]))) {
    return res.status(404).json({ error: 'User not found' });
  }
  (await execute('UPDATE users SET is_admin = 0 WHERE id = ?', [id]));
  res.json({ ok: true });
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) {
    return res.status(400).json({ error: "You can't delete your own account" });
  }

  const user = (await queryOne('SELECT id, username, is_managed_by_sonara FROM users WHERE id = ?', [id]));
  if (!user) return res.status(404).json({ error: 'User not found' });

  const force = req.query.force === '1';
  if (!user.is_managed_by_sonara && !force) {
    return res.status(400).json({
      error: 'This is a real user account. Only managed artists can be deleted. Add ?force=1 to override.',
    });
  }

  const tracks = (await query('SELECT id, audio_path, image_path FROM tracks WHERE artist_id = ?', [id]));
  for (const t of tracks) {
    if (t.audio_path) fs.unlink(path.join(__dirname, '..', t.audio_path), () => {});
    if (t.image_path) fs.unlink(path.join(__dirname, '..', t.image_path), () => {});
  }

  const albums = (await query('SELECT id, cover_path FROM albums WHERE artist_id = ?', [id]));
  for (const a of albums) {
    if (a.cover_path) fs.unlink(path.join(__dirname, '..', a.cover_path), () => {});
  }

  const ownerKey = `user:${id}`;
  (await execute('DELETE FROM tracks WHERE artist_id = ?', [id]));
  (await execute('DELETE FROM albums WHERE artist_id = ?', [id]));
  (await execute('DELETE FROM playlists WHERE owner_id = ?', [ownerKey]));
  (await execute('DELETE FROM favorites WHERE user_id = ?', [ownerKey]));
  (await execute('DELETE FROM listening_history WHERE user_id = ?', [ownerKey]));
  (await execute('DELETE FROM follows WHERE followee_id = ? OR follower_id = ?', [id, ownerKey]));
  (await execute('DELETE FROM users WHERE id = ?', [id]));

  res.json({
    ok: true,
    deleted: {
      username: user.username,
      tracks: tracks.length,
      albums: albums.length,
    },
  });
});

/* ---------- Uploads ---------- */

router.post('/upload/track', requireAdmin, uploadSingle, async (req, res) => {
  const audioFile = req.files?.audio?.[0];
  const imageFile = req.files?.image?.[0];

  if (!audioFile) return res.status(400).json({ error: 'Audio file required' });

  const { title, artistName, albumName, duration } = req.body || {};
  if (!title?.trim()) {
    fs.unlink(audioFile.path, () => {});
    if (imageFile) fs.unlink(imageFile.path, () => {});
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!artistName?.trim()) {
    fs.unlink(audioFile.path, () => {});
    if (imageFile) fs.unlink(imageFile.path, () => {});
    return res.status(400).json({ error: 'Artist name is required' });
  }

  const artistId = ensureArtist(artistName.trim());
  if (!artistId) return res.status(400).json({ error: 'Could not resolve artist' });

  const audioPath = `/uploads/audio/${audioFile.filename}`;

  let imagePath = imageFile ? `/uploads/images/${imageFile.filename}` : null;
  let embeddedDuration = null;
  if (!imagePath) {
    try {
      const buffer = fs.readFileSync(audioFile.path);
      const meta = await readAudioMetadata(buffer, audioFile.originalname);
      if (meta?.cover?.data?.length) {
        imagePath = saveCoverBuffer(meta.cover.data, meta.cover.ext);
      }
      if (meta?.duration) embeddedDuration = meta.duration;
    } catch (err) {
      console.warn('[admin upload] metadata read failed:', err.message);
    }
  }

  // NEW: strip the artist prefix from the title if present
  const cleanTitle = stripArtistPrefixFromTitle(title.trim(), artistName.trim()) || title.trim();

  const dur = duration ? parseInt(duration, 10) : embeddedDuration;
  const albumId = albumName?.trim() ? getOrCreateAlbum(albumName.trim(), artistId, imagePath) : null;

  const trackId = createTrackRow({
    title: cleanTitle,
    artistId,
    albumId,
    duration: dur,
    audioPath,
    imagePath,
  });

  const row = (await queryOne(`${TRACK_SELECT} WHERE t.id = ?`, [trackId]));
  res.status(201).json({ track: serializeTrack(row) });
});

router.post('/upload/zip', requireAdmin, async (req, res, next) => {
  uploadZip(req, res, async (err) => {
    if (err) return next(err);
    if (!req.file) return res.status(400).json({ error: 'No zip file uploaded' });

    let zip;
    try {
      zip = new AdmZip(req.file.path);
    } catch (e) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Invalid zip file' });
    }

    const entries = zip.getEntries();
    const results = {
      imported: [],
      skipped: [],
      artistsCreated: 0,
      artistsReused: 0,
      coversExtracted: 0,
      errors: [],
    };

    const knownArtistsBefore = new Set(
      (await query('SELECT id FROM users', [])).map(u => u.id)
    );

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const parsed = parseEntryName(entry.entryName);
      if (!parsed) {
        results.skipped.push({ name: entry.entryName, reason: 'unsupported' });
        continue;
      }

      let buffer;
      try {
        buffer = entry.getData();
      } catch (err) {
        results.errors.push({ name: entry.entryName, error: 'failed to read' });
        continue;
      }
      if (!buffer || buffer.length < 1024) {
        results.skipped.push({ name: entry.entryName, reason: 'empty file' });
        continue;
      }

      let meta = null;
      try {
        meta = await readAudioMetadata(buffer, entry.entryName);
      } catch (err) {
        // Non-fatal
      }

      let finalTitle = parsed.title || null;
      let finalArtist = parsed.artist || null;
      let finalAlbum = parsed.album || null;

      if (!finalTitle && meta?.title) {
        const metaSplit = splitArtistTitle(meta.title);
        finalTitle = metaSplit.title || meta.title;
        if (!finalArtist && metaSplit.artist) finalArtist = metaSplit.artist;
        if (!finalAlbum && metaSplit.album) finalAlbum = metaSplit.album;
      }
      if (!finalArtist && meta?.artist) finalArtist = meta.artist;
      if (!finalAlbum && meta?.album) finalAlbum = meta.album;

      if (!finalTitle) finalTitle = 'Untitled';
      if (!finalArtist) {
        results.skipped.push({ name: entry.entryName, reason: 'no artist in path or metadata' });
        continue;
      }

      // Strip whitespace-dash form (e.g. "Asake - Title")
      if (finalTitle && finalArtist && finalTitle !== finalArtist) {
        const reSplit = splitArtistTitle(finalTitle);
        if (reSplit.artist && reSplit.artist.toLowerCase() === finalArtist.toLowerCase() && reSplit.title) {
          finalTitle = reSplit.title;
          if (!finalAlbum && reSplit.album) finalAlbum = reSplit.album;
        }
      }

      // NEW: strip any other separator form (e.g. "6uff-The-Truth" → "The-Truth")
      finalTitle = stripArtistPrefixFromTitle(finalTitle, finalArtist) || finalTitle;

      // Save audio
      const ext = path.extname(entry.entryName).toLowerCase() || '.mp3';
      const safeExt = ALLOWED_AUDIO.includes(ext) ? ext : '.mp3';
      const filename = `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
      fs.writeFileSync(path.join(AUDIO_DIR, filename), buffer);
      const audioPath = `/uploads/audio/${filename}`;

      // Save cover
      let imagePath = null;
      if (meta?.cover?.data?.length) {
        imagePath = saveCoverBuffer(meta.cover.data, meta.cover.ext);
        results.coversExtracted += 1;
      }

      const artistId = ensureArtist(finalArtist);
      const albumId = finalAlbum ? getOrCreateAlbum(finalAlbum, artistId, imagePath) : null;

      if (!knownArtistsBefore.has(artistId)) {
        results.artistsCreated += 1;
        knownArtistsBefore.add(artistId);
      } else {
        results.artistsReused += 1;
      }

      const trackId = createTrackRow({
        title: finalTitle,
        artistId,
        albumId,
        duration: meta?.duration || null,
        audioPath,
        imagePath,
      });

      results.imported.push({
        trackId,
        artist: finalArtist,
        title: finalTitle,
        album: finalAlbum,
        hasCover: !!imagePath,
      });
    }

    fs.unlink(req.file.path, () => {});

    res.json({
      summary: {
        total: entries.length,
        imported: results.imported.length,
        skipped: results.skipped.length,
        artistsCreated: results.artistsCreated,
        artistsReused: results.artistsReused,
        coversExtracted: results.coversExtracted,
      },
      imported: results.imported.slice(0, 100),
      skipped: results.skipped.slice(0, 50),
      errors: results.errors.slice(0, 20),
    });
  });
});

router.post('/artists/bulk', requireAdmin, (req, res) => {
  const names = Array.isArray(req.body?.names) ? req.body.names : [];
  if (!names.length) return res.status(400).json({ error: 'names array required' });

  const results = bulkCreateArtists(names);
  res.json(results);
});

/* ---------- Artist → Admin messages ---------- */

router.get('/messages', requireAdmin, async (req, res) => {
  const status = (req.query.status || 'open').toString();
  const rows = (await query(`
    SELECT m.*, u.username, u.display_name, u.avatar_path,
      (SELECT COUNT(*) FROM artist_message_replies r WHERE r.message_id = m.id) AS reply_count
    FROM artist_messages m
    JOIN users u ON u.id = m.artist_id
    WHERE m.status = ?
    ORDER BY m.created_at DESC
  `, [status]));

  res.json({
    messages: rows.map(m => ({
      id: m.id,
      artistId: m.artist_id,
      artistUsername: m.username,
      artistDisplayName: m.display_name,
      artistAvatar: m.avatar_path,
      subject: m.subject,
      body: m.body,
      status: m.status,
      replyCount: m.reply_count,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    })),
  });
});

router.get('/messages/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const m = (await queryOne(`
    SELECT m.*, u.username, u.display_name, u.avatar_path
    FROM artist_messages m
    JOIN users u ON u.id = m.artist_id
    WHERE m.id = ?
  `, [id]));
  if (!m) return res.status(404).json({ error: 'Message not found' });

  const replies = (await query(`
    SELECT r.*, u.username, u.display_name, u.avatar_path
    FROM artist_message_replies r
    LEFT JOIN users u ON u.id = r.author_id
    WHERE r.message_id = ?
    ORDER BY r.created_at ASC
  `, [id]));

  res.json({
    message: {
      id: m.id,
      artistId: m.artist_id,
      artistUsername: m.username,
      artistDisplayName: m.display_name,
      artistAvatar: m.avatar_path,
      subject: m.subject,
      body: m.body,
      status: m.status,
      createdAt: m.created_at,
    },
    replies: replies.map(r => ({
      id: r.id,
      authorId: r.author_id,
      authorUsername: r.username,
      authorDisplayName: r.display_name,
      authorAvatar: r.avatar_path,
      isAdmin: !!r.is_admin,
      body: r.body,
      createdAt: r.created_at,
    })),
  });
});

router.post('/messages/:id/reply', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = (req.body?.body || '').toString().trim();
  if (!body) return res.status(400).json({ error: 'Body required' });

  const m = (await queryOne('SELECT id FROM artist_messages WHERE id = ?', [id]));
  if (!m) return res.status(404).json({ error: 'Message not found' });

  (await execute(`
    INSERT INTO artist_message_replies (message_id, author_id, is_admin, body)
    VALUES (?, ?, 1, ?)
  `, [id, req.user.id, body]));

  (await execute(`UPDATE artist_messages SET updated_at = datetime('now') WHERE id = ?`, [id]));
  res.status(201).json({ ok: true });
});

router.post('/messages/:id/resolve', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  (await execute(`UPDATE artist_messages SET status = 'resolved', updated_at = datetime('now') WHERE id = ?`, [id]));
  res.json({ ok: true });
});

router.post('/messages/:id/reopen', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  (await execute(`UPDATE artist_messages SET status = 'open', updated_at = datetime('now') WHERE id = ?`, [id]));
  res.json({ ok: true });
});

/* ---------- Activity ---------- */

router.get('/activity', requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '30', 10), 100);

  const uploads = (await query(`
    SELECT t.id, t.title, t.created_at, u.username
    FROM tracks t
    LEFT JOIN users u ON u.id = t.artist_id
    WHERE t.source = 'local'
    ORDER BY t.created_at DESC LIMIT ?
  `, [limit]));

  const newUsers = (await query(`
    SELECT id, username, display_name, created_at
    FROM users ORDER BY created_at DESC LIMIT ?
  `, [limit]));

  const newPlaylists = (await query(`
    SELECT p.id, p.name, p.created_at, p.owner_id
    FROM playlists p ORDER BY p.created_at DESC LIMIT ?
  `, [limit]));

  res.json({
    uploads: uploads.map(u => ({
      id: u.id, title: u.title, createdAt: u.created_at, username: u.username || 'Unknown',
    })),
    newUsers: newUsers.map(u => ({
      id: u.id, username: u.username, displayName: u.display_name, createdAt: u.created_at,
    })),
    newPlaylists: newPlaylists.map(p => ({
      id: p.id, name: p.name, createdAt: p.created_at, ownerId: p.owner_id,
    })),
  });
});

export default router;