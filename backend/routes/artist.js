// backend/routes/artist.js
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { query, queryOne, execute } from '../db/turso.js';
import { requireAuth, requireVerifiedArtist } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, '..', 'uploads', 'audio');
const IMAGE_DIR = path.join(__dirname, '..', 'uploads', 'images');
fs.mkdirSync(AUDIO_DIR, { recursive: true });
fs.mkdirSync(IMAGE_DIR, { recursive: true });

const ALLOWED_AUDIO = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.opus', '.webm'];
const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === 'audio') cb(null, AUDIO_DIR);
    else cb(null, IMAGE_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = file.fieldname === 'audio'
      ? (ALLOWED_AUDIO.includes(ext) ? ext : '.mp3')
      : (ALLOWED_IMAGE.includes(ext) ? ext : '.jpg');
    cb(null, `track-${req.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'audio' && !file.mimetype.startsWith('audio/')) {
      return cb(new Error('Only audio files are allowed for the audio field'));
    }
    if (file.fieldname === 'image' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for the image field'));
    }
    cb(null, true);
  },
});

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    display_name: user.display_name,
    avatar_path: user.avatar_path,
    bio: user.bio,
    is_verified_artist: !!user.is_verified_artist,
    is_admin: !!user.is_admin,
    is_managed_by_sonara: !!user.is_managed_by_sonara,
  };
}

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
    playCount: row.play_count || 0,
    album: row.album_name
      ? {
          id: row.album_id,
          name: row.album_name,
          image: row.album_cover || null,
        }
      : null,
    artist: {
      id: row.artist_id,
      name: row.artist_display_name || row.artist_username || 'Unknown Artist',
      handle: row.artist_username || null,
      image: row.artist_avatar || null,
    },
    createdAt: row.created_at,
  };
}

function serializeAlbum(row) {
  return {
    id: row.id,
    name: row.name,
    coverPath: row.cover_path,
    releaseDate: row.release_date,
    trackCount: row.track_count || 0,
    createdAt: row.created_at,
  };
}

function serializePlaylist(row) {
  let firstImage = null;
  if (row.first_track_json) {
    try { firstImage = JSON.parse(row.first_track_json)?.image || null; } catch {}
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    trackCount: row.track_count || 0,
    isPublic: !!row.is_public,
    firstTrackImage: firstImage,
    updatedAt: row.updated_at,
  };
}

// KEY FIX: play_count subquery needs CAST because track_ref_id is TEXT
const TRACK_SELECT = `
  SELECT t.*,
         u.display_name AS artist_display_name,
         u.username     AS artist_username,
         u.avatar_path  AS artist_avatar,
         a.name         AS album_name,
         a.cover_path   AS album_cover,
         (SELECT COUNT(*) FROM listening_history h
          WHERE h.track_source = 'local'
            AND CAST(h.track_ref_id AS INTEGER) = t.id) AS play_count
  FROM tracks t
  LEFT JOIN albums a ON a.id = t.album_id
  LEFT JOIN users  u ON u.id = t.artist_id
`;

const router = Router();

// POST /api/artist/apply — become a verified artist (auto-approve)
router.post('/apply', requireAuth, async (req, res) => {
  const { artist_name } = req.body || {};
  const name = (artist_name || req.user.display_name || req.user.username || '').trim();
  if (!name) return res.status(400).json({ error: 'Artist name is required' });

  if (req.user.is_verified_artist) {
    const existing = (await queryOne('SELECT id, username, email, display_name, avatar_path, bio, is_verified_artist, is_admin, is_managed_by_sonara FROM users WHERE id = ?', [req.user.id]));
    return res.json({ ok: true, alreadyArtist: true, user: sanitizeUser(existing) });
  }

  const updates = ['is_verified_artist = 1'];
  const params = [];
  if (!req.user.display_name) {
    updates.push('display_name = ?');
    params.push(name);
  }
  params.push(req.user.id);
  (await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, [...params]));

  const user = (await queryOne('SELECT id, username, email, display_name, avatar_path, bio, is_verified_artist, is_admin, is_managed_by_sonara FROM users WHERE id = ?', [req.user.id]));

  res.json({ ok: true, user: sanitizeUser(user) });
});

// GET /api/artist/me — my dashboard data (verified artists only)
router.get('/me', requireVerifiedArtist, async (req, res) => {
  const tracks = (await query(`${TRACK_SELECT}
     WHERE t.artist_id = ? AND t.source = 'local'
     ORDER BY play_count DESC, t.created_at DESC`, [req.user.id]));

  const albums = (await query(`SELECT a.*, (SELECT COUNT(*) FROM tracks t WHERE t.album_id = a.id) AS track_count
     FROM albums a
     WHERE a.artist_id = ?
     ORDER BY a.created_at DESC`, [req.user.id]));

  const plays = (await queryOne(`SELECT COUNT(*) AS c FROM listening_history h
     WHERE h.track_source = 'local'
     AND CAST(h.track_ref_id AS INTEGER) IN (SELECT id FROM tracks WHERE artist_id = ?)`, [req.user.id])).c;

  const followers = (await queryOne(`SELECT COUNT(*) AS c FROM follows WHERE followee_id = ?`, [req.user.id])).c;

  res.json({
    tracks: tracks.map(serializeTrack),
    albums: albums.map(serializeAlbum),
    stats: {
      plays,
      followers,
      trackCount: tracks.length,
      albumCount: albums.length,
    },
  });
});

// POST /api/artist/albums — create a standalone album
router.post('/albums', requireVerifiedArtist, async (req, res) => {
  const { name, coverPath, releaseDate } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Album name required' });

  const r = (await execute(`INSERT INTO albums (name, artist_id, cover_path, release_date) VALUES (?, ?, ?, ?)`, [name.trim(), req.user.id, coverPath || null, releaseDate || null]));

  const album = (await queryOne('SELECT * FROM albums WHERE id = ?', [Number(r.lastInsertRowid)]));
  res.status(201).json({ album: serializeAlbum(album) });
});

// POST /api/artist/upload — multipart upload of a track
router.post(
  '/upload',
  requireVerifiedArtist,
  upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'image', maxCount: 1 }]),
  async (req, res) => {
    const audioFile = req.files?.audio?.[0];
    const imageFile = req.files?.image?.[0];

    if (!audioFile) return res.status(400).json({ error: 'Audio file required' });

    const { title, duration, albumId, albumName } = req.body || {};
    if (!title || !title.trim()) {
      fs.unlink(audioFile.path, () => {});
      if (imageFile) fs.unlink(imageFile.path, () => {});
      return res.status(400).json({ error: 'Title is required' });
    }

    const audioPath = `/uploads/audio/${audioFile.filename}`;
    const imagePath = imageFile ? `/uploads/images/${imageFile.filename}` : null;
    const dur = duration ? parseInt(duration, 10) : null;

    let finalAlbumId = null;
    if (albumId) {
      const existing = (await queryOne('SELECT id FROM albums WHERE id = ? AND artist_id = ?', [parseInt(albumId, 10), req.user.id]));
      if (existing) finalAlbumId = existing.id;
    }
    if (!finalAlbumId && albumName && albumName.trim()) {
      const r = (await execute(`INSERT INTO albums (name, artist_id, cover_path) VALUES (?, ?, ?)`, [albumName.trim(), req.user.id, imagePath]));
      finalAlbumId = Number(r.lastInsertRowid);
    }

    const result = (await execute(`INSERT INTO tracks (title, artist_id, album_id, duration, audio_path, image_path, source)
       VALUES (?, ?, ?, ?, ?, ?, 'local')`, [title.trim(), req.user.id, finalAlbumId, dur, audioPath, imagePath]));

    const trackId = Number(result.lastInsertRowid);
    (await execute('UPDATE tracks SET source_id = ? WHERE id = ?', [String(trackId), trackId]));

    const row = (await queryOne(`${TRACK_SELECT} WHERE t.id = ?`, [trackId]));
    res.status(201).json({ track: serializeTrack(row) });
  }
);

// DELETE /api/artist/tracks/:id — delete own track
router.delete('/tracks/:id', requireVerifiedArtist, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = (await queryOne('SELECT * FROM tracks WHERE id = ? AND artist_id = ?', [id, req.user.id]));
  if (!row) return res.status(404).json({ error: 'Track not found or not yours' });

  if (row.audio_path) fs.unlink(path.join(__dirname, '..', row.audio_path), () => {});
  if (row.image_path) fs.unlink(path.join(__dirname, '..', row.image_path), () => {});

  (await execute('DELETE FROM tracks WHERE id = ?', [id]));
  res.json({ ok: true });
});

// GET /api/artist/:userId/albums/:albumId — one album + its tracks
router.get('/:userId/albums/:albumId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const albumId = parseInt(req.params.albumId, 10);
  if (!Number.isInteger(userId) || !Number.isInteger(albumId)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const albumRow = (await queryOne('SELECT * FROM albums WHERE id = ? AND artist_id = ?', [albumId, userId]));
  if (!albumRow) return res.status(404).json({ error: 'Album not found' });

  const user = (await queryOne('SELECT id, username, display_name, avatar_path, is_verified_artist FROM users WHERE id = ?', [userId]));

  const trackCount = (await queryOne('SELECT COUNT(*) AS c FROM tracks WHERE album_id = ?', [albumId])).c;

  const tracks = (await query(`${TRACK_SELECT}
     WHERE t.album_id = ? AND t.artist_id = ?
     ORDER BY t.id ASC`, [albumId, userId]));

  res.json({
    album: serializeAlbum({ ...albumRow, track_count: trackCount }),
    artist: {
      id: user.id,
      username: user.username,
      displayName: user.display_name || user.username,
      avatarPath: user.avatar_path,
      verified: !!user.is_verified_artist,
    },
    tracks: tracks.map(serializeTrack),
  });
});

// GET /api/artist/:userId — public profile for ANY user
router.get('/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Invalid id' });

  const user = (await queryOne('SELECT id, username, display_name, avatar_path, bio, is_verified_artist, is_managed_by_sonara FROM users WHERE id = ?', [userId]));
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isArtist = !!user.is_verified_artist;

  const tracks = isArtist
    ? (await query(`${TRACK_SELECT}
         WHERE t.artist_id = ? AND t.source = 'local'
         ORDER BY play_count DESC, t.created_at DESC`, [userId]))
    : [];

  const albums = isArtist
    ? (await query(`SELECT a.*, (SELECT COUNT(*) FROM tracks t WHERE t.album_id = a.id) AS track_count
         FROM albums a
         WHERE a.artist_id = ?
         ORDER BY a.created_at DESC`, [userId]))
    : [];

  const plays = isArtist
    ? (await queryOne(`SELECT COUNT(*) AS c FROM listening_history h
         WHERE h.track_source = 'local'
         AND CAST(h.track_ref_id AS INTEGER) IN (SELECT id FROM tracks WHERE artist_id = ?)`, [userId])).c
    : 0;

  const followers = (await queryOne(`SELECT COUNT(*) AS c FROM follows WHERE followee_id = ?`, [userId])).c;
  const following = (await queryOne(`SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?`, [`user:${userId}`])).c;

  const playlistRows = (await query(`SELECT p.*,
       (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS track_count,
       (SELECT pt.track_json FROM playlist_tracks pt
        WHERE pt.playlist_id = p.id
        ORDER BY pt.position ASC, pt.id ASC LIMIT 1) AS first_track_json
     FROM playlists p
     WHERE p.owner_id = ? AND p.is_public = 1
     ORDER BY p.updated_at DESC`, [`user:${userId}`]));

  res.json({
    artist: {
      id: user.id,
      username: user.username,
      displayName: user.display_name || user.username,
      avatarPath: user.avatar_path,
      bio: user.bio,
      verified: isArtist,
      managedBySonara: !!user.is_managed_by_sonara,
    },
    tracks: tracks.map(serializeTrack),
    albums: albums.map(serializeAlbum),
    playlists: playlistRows.map(serializePlaylist),
    stats: {
      plays,
      followers,
      following,
      trackCount: tracks.length,
      albumCount: albums.length,
    },
  });
});

export default router;