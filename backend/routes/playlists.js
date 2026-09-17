// backend/routes/playlists.js
import { Router } from 'express';
import { query, queryOne, execute, transaction } from '../db/turso.js';
import { requireUserId } from '../middleware/userId.js';

const router = Router();

/* ============================================================
   Helpers
   ============================================================ */

function rowToPlaylist(row, trackCount, firstTrackImage, collaborators = [], extra = {}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    isPublic: !!row.is_public,
    isCollaborative: !!row.is_collaborative,
    shareCode: row.share_code || null,
    coverPath: row.cover_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    trackCount: trackCount ?? 0,
    firstTrackImage: firstTrackImage || null,
    collaborators,
    ...extra,
  };
}

function ownsPlaylist(row, userId) {
  return row && row.owner_id === userId;
}

async function getCollaborators(playlistId) {
  const rows = await query(`
    SELECT c.user_id, c.added_at, u.username, u.display_name, u.avatar_path
    FROM playlist_collaborators c
    LEFT JOIN users u ON ('user:' || u.id) = c.user_id
    WHERE c.playlist_id = ?
    ORDER BY c.added_at ASC
  `, [playlistId]);

  return rows.map(r => ({
    userId: r.user_id,
    username: r.username || null,
    displayName: r.display_name || null,
    avatarPath: r.avatar_path || null,
    addedAt: r.added_at,
  }));
}

async function isCollaborator(playlistId, userId) {
  const row = await queryOne(
    'SELECT id FROM playlist_collaborators WHERE playlist_id = ? AND user_id = ?',
    [playlistId, userId]
  );
  return !!row;
}

async function canEditPlaylist(row, userId) {
  if (!row) return false;
  if (row.owner_id === userId) return true;
  return await isCollaborator(row.id, userId);
}

function generateShareCode() {
  const chars = 'abcdefghijkmnDcJHrrHSgvFpsYxqb6g97uaQTd2kE31rPUeDZTeDsjVq';
  let code = '';
  for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function firstTrackImageFor(playlistId) {
  const row = await queryOne(
    `SELECT track_json FROM playlist_tracks
     WHERE playlist_id = ?
     ORDER BY position ASC, id ASC LIMIT 1`,
    [playlistId]
  );
  if (!row?.track_json) return null;
  try { return JSON.parse(row.track_json)?.image || null; } catch { return null; }
}

/* ============================================================
   FOLDERS
   ============================================================ */

router.get('/folders', requireUserId, async (req, res) => {
  const folders = await query(
    'SELECT * FROM playlist_folders WHERE owner_id = ? ORDER BY position ASC, id ASC',
    [req.userId]
  );

  const result = [];
  for (const f of folders) {
    const items = await query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS track_count
      FROM playlist_folder_items fi
      JOIN playlists p ON p.id = fi.playlist_id
      WHERE fi.folder_id = ?
      ORDER BY fi.position ASC, fi.id ASC
    `, [f.id]);

    const playlistItems = [];
    for (const p of items) {
      playlistItems.push({
        id: p.id,
        name: p.name,
        trackCount: p.track_count || 0,
        isPublic: !!p.is_public,
        firstTrackImage: await firstTrackImageFor(p.id),
      });
    }

    result.push({
      id: f.id,
      name: f.name,
      position: f.position,
      createdAt: f.created_at,
      playlists: playlistItems,
    });
  }

  res.json({ folders: result });
});

router.post('/folders', requireUserId, async (req, res) => {
  const name = (req.body?.name || '').toString().trim();
  if (!name) return res.status(400).json({ error: 'Folder name required' });
  if (name.length > 60) return res.status(400).json({ error: 'Folder name too long (max 60)' });

  const maxRow = await queryOne(
    `SELECT COALESCE(MAX(position), -1) AS p FROM playlist_folders WHERE owner_id = ?`,
    [req.userId]
  );
  const maxPos = maxRow?.p ?? -1;

  const r = await execute(
    `INSERT INTO playlist_folders (owner_id, name, position) VALUES (?, ?, ?)`,
    [req.userId, name, maxPos + 1]
  );

  const folder = await queryOne('SELECT * FROM playlist_folders WHERE id = ?', [Number(r.lastInsertRowid)]);
  res.status(201).json({
    folder: { id: folder.id, name: folder.name, position: folder.position, playlists: [] },
  });
});

router.patch('/folders/:id', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await queryOne('SELECT * FROM playlist_folders WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Folder not found' });
  if (row.owner_id !== req.userId) return res.status(403).json({ error: 'Not your folder' });

  const name = (req.body?.name || '').toString().trim();
  if (!name) return res.status(400).json({ error: 'Folder name required' });

  await execute('UPDATE playlist_folders SET name = ? WHERE id = ?', [name, id]);
  res.json({ ok: true, folder: { id, name } });
});

router.delete('/folders/:id', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await queryOne('SELECT * FROM playlist_folders WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Folder not found' });
  if (row.owner_id !== req.userId) return res.status(403).json({ error: 'Not your folder' });

  await execute('DELETE FROM playlist_folders WHERE id = ?', [id]);
  res.json({ ok: true });
});

router.post('/folders/:id/playlists', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const folder = await queryOne('SELECT * FROM playlist_folders WHERE id = ?', [id]);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  if (folder.owner_id !== req.userId) return res.status(403).json({ error: 'Not your folder' });

  const playlistId = parseInt(req.body?.playlistId, 10);
  if (!playlistId) return res.status(400).json({ error: 'playlistId required' });

  const playlist = await queryOne('SELECT * FROM playlists WHERE id = ?', [playlistId]);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
  if (!ownsPlaylist(playlist, req.userId)) {
    return res.status(403).json({ error: 'Can only add your own playlists to folders' });
  }

  const exists = await queryOne(
    'SELECT id FROM playlist_folder_items WHERE folder_id = ? AND playlist_id = ?',
    [id, playlistId]
  );
  if (exists) return res.json({ ok: true, alreadyIn: true });

  const maxRow = await queryOne(
    `SELECT COALESCE(MAX(position), -1) AS p FROM playlist_folder_items WHERE folder_id = ?`,
    [id]
  );
  const maxPos = maxRow?.p ?? -1;

  await execute(
    `INSERT INTO playlist_folder_items (folder_id, playlist_id, position) VALUES (?, ?, ?)`,
    [id, playlistId, maxPos + 1]
  );

  res.status(201).json({ ok: true });
});

router.delete('/folders/:id/playlists/:playlistId', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const playlistId = parseInt(req.params.playlistId, 10);

  const folder = await queryOne('SELECT * FROM playlist_folders WHERE id = ?', [id]);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  if (folder.owner_id !== req.userId) return res.status(403).json({ error: 'Not your folder' });

  await execute(
    'DELETE FROM playlist_folder_items WHERE folder_id = ? AND playlist_id = ?',
    [id, playlistId]
  );

  res.json({ ok: true });
});

router.patch('/folders/:id/reorder', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const folder = await queryOne('SELECT * FROM playlist_folders WHERE id = ?', [id]);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  if (folder.owner_id !== req.userId) return res.status(403).json({ error: 'Not your folder' });

  const order = Array.isArray(req.body?.order) ? req.body.order : null;
  if (!order) return res.status(400).json({ error: 'order array required' });

  await transaction(async (tx) => {
    for (let idx = 0; idx < order.length; idx++) {
      const pid = parseInt(order[idx], 10);
      await tx.execute(
        'UPDATE playlist_folder_items SET position = ? WHERE folder_id = ? AND playlist_id = ?',
        [idx, id, pid]
      );
    }
  });

  res.json({ ok: true });
});

/* ============================================================
   COLLAB JOIN
   ============================================================ */

router.post('/join/:code', requireUserId, async (req, res) => {
  const code = (req.params.code || '').toString().trim();
  if (!code) return res.status(400).json({ error: 'Missing code' });

  const playlist = await queryOne('SELECT * FROM playlists WHERE share_code = ?', [code]);
  if (!playlist) return res.status(404).json({ error: 'Invalid or expired invite' });

  if (playlist.owner_id === req.userId) {
    return res.json({ ok: true, already: 'owner', playlistId: playlist.id });
  }

  const already = await isCollaborator(playlist.id, req.userId);
  if (already) return res.json({ ok: true, already: 'collaborator', playlistId: playlist.id });

  await execute(
    'INSERT INTO playlist_collaborators (playlist_id, user_id) VALUES (?, ?)',
    [playlist.id, req.userId]
  );

  await execute(
    `UPDATE playlists SET is_collaborative = 1, updated_at = datetime('now') WHERE id = ?`,
    [playlist.id]
  );

  res.json({ ok: true, playlistId: playlist.id });
});

/* ============================================================
   PLAYLISTS
   ============================================================ */

router.get('/', requireUserId, async (req, res) => {
  const rows = await query(`
    SELECT DISTINCT p.*,
      (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS track_count
    FROM playlists p
    LEFT JOIN playlist_collaborators c ON c.playlist_id = p.id
    WHERE p.owner_id = ? OR c.user_id = ?
    ORDER BY p.updated_at DESC
  `, [req.userId, req.userId]);

  const playlists = [];
  for (const r of rows) {
    const collabs = await getCollaborators(r.id);
    playlists.push(rowToPlaylist(r, r.track_count, await firstTrackImageFor(r.id), collabs, {
      isOwner: r.owner_id === req.userId,
      isCollaborator: r.owner_id !== req.userId,
    }));
  }

  res.json({ playlists });
});

router.post('/', requireUserId, async (req, res) => {
  const { name, description, isPublic } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }

  const result = await execute(
    `INSERT INTO playlists (name, description, owner_id, is_public)
     VALUES (?, ?, ?, ?)`,
    [name.trim(), description?.trim() || null, req.userId, isPublic ? 1 : 0]
  );

  const row = await queryOne('SELECT * FROM playlists WHERE id = ?', [Number(result.lastInsertRowid)]);
  res.status(201).json({ playlist: rowToPlaylist(row, 0) });
});

router.get('/:id', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await queryOne('SELECT * FROM playlists WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Playlist not found' });

  const isOwner = ownsPlaylist(row, req.userId);
  const isCollab = await isCollaborator(id, req.userId);
  const canView = isOwner || isCollab || row.is_public;
  if (!canView) return res.status(403).json({ error: 'Playlist is private' });

  const trackRows = await query(
    `SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC, id ASC`,
    [id]
  );

  const tracks = trackRows
    .map(t => {
      let track = null;
      try { track = t.track_json ? JSON.parse(t.track_json) : null; } catch {}
      return track ? { ...track, _ptId: t.id, _position: t.position } : null;
    })
    .filter(Boolean);

  const collaborators = await getCollaborators(id);
  const shareCode = isOwner ? (row.share_code || null) : null;

  res.json({
    playlist: rowToPlaylist(row, tracks.length, null, collaborators, { shareCode }),
    tracks,
    isOwner,
    isCollaborator: isCollab,
    canEdit: isOwner || isCollab,
  });
});

router.patch('/:id', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await queryOne('SELECT * FROM playlists WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Playlist not found' });
  if (!ownsPlaylist(row, req.userId)) return res.status(403).json({ error: 'Not your playlist' });

  const { name, description, isPublic } = req.body || {};
  const next = {
    name: name !== undefined ? (name.trim() || row.name) : row.name,
    description: description !== undefined ? (description?.trim() || null) : row.description,
    is_public: isPublic !== undefined ? (isPublic ? 1 : 0) : row.is_public,
  };

  await execute(
    `UPDATE playlists SET name = ?, description = ?, is_public = ?, updated_at = datetime('now') WHERE id = ?`,
    [next.name, next.description, next.is_public, id]
  );

  const updated = await queryOne('SELECT * FROM playlists WHERE id = ?', [id]);
  res.json({ playlist: rowToPlaylist(updated) });
});

router.delete('/:id', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await queryOne('SELECT * FROM playlists WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Playlist not found' });
  if (!ownsPlaylist(row, req.userId)) return res.status(403).json({ error: 'Not your playlist' });

  await execute('DELETE FROM playlists WHERE id = ?', [id]);
  res.json({ ok: true });
});

router.post('/:id/tracks', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await queryOne('SELECT * FROM playlists WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Playlist not found' });
  if (!(await canEditPlaylist(row, req.userId))) return res.status(403).json({ error: 'Not allowed' });

  const { track } = req.body || {};
  if (!track?.id || !track.source || !track.sourceId) {
    return res.status(400).json({ error: 'track.id, track.source, track.sourceId required' });
  }

  const exists = await queryOne(
    `SELECT id FROM playlist_tracks WHERE playlist_id = ? AND track_source = ? AND track_ref_id = ?`,
    [id, track.source, String(track.sourceId)]
  );
  if (exists) {
    return res.status(409).json({ error: 'Track already in playlist' });
  }

  const maxRow = await queryOne(
    `SELECT COALESCE(MAX(position), -1) AS p FROM playlist_tracks WHERE playlist_id = ?`,
    [id]
  );
  const maxPos = maxRow?.p ?? -1;

  const result = await execute(
    `INSERT INTO playlist_tracks (playlist_id, track_source, track_ref_id, track_json, position)
     VALUES (?, ?, ?, ?, ?)`,
    [id, track.source, String(track.sourceId), JSON.stringify(track), maxPos + 1]
  );

  await execute(`UPDATE playlists SET updated_at = datetime('now') WHERE id = ?`, [id]);

  res.status(201).json({ ok: true, itemId: Number(result.lastInsertRowid) });
});

router.delete('/:id/tracks/:itemId', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const itemId = parseInt(req.params.itemId, 10);
  const row = await queryOne('SELECT * FROM playlists WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Playlist not found' });
  if (!(await canEditPlaylist(row, req.userId))) return res.status(403).json({ error: 'Not allowed' });

  await execute('DELETE FROM playlist_tracks WHERE id = ? AND playlist_id = ?', [itemId, id]);
  await execute(`UPDATE playlists SET updated_at = datetime('now') WHERE id = ?`, [id]);
  res.json({ ok: true });
});

router.patch('/:id/reorder', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await queryOne('SELECT * FROM playlists WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Playlist not found' });
  if (!(await canEditPlaylist(row, req.userId))) return res.status(403).json({ error: 'Not allowed' });

  const { order } = req.body || {};
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });

  await transaction(async (tx) => {
    for (let idx = 0; idx < order.length; idx++) {
      const itemId = order[idx];
      await tx.execute(
        `UPDATE playlist_tracks SET position = ? WHERE id = ? AND playlist_id = ?`,
        [idx, itemId, id]
      );
    }
  });

  await execute(`UPDATE playlists SET updated_at = datetime('now') WHERE id = ?`, [id]);
  res.json({ ok: true });
});

/* ============================================================
   SHARE / COLLABORATORS
   ============================================================ */

router.post('/:id/share', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await queryOne('SELECT * FROM playlists WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Playlist not found' });
  if (!ownsPlaylist(row, req.userId)) return res.status(403).json({ error: 'Not your playlist' });

  let code = row.share_code;
  if (!code) {
    for (let i = 0; i < 5; i++) {
      const candidate = generateShareCode();
      const conflict = await queryOne('SELECT id FROM playlists WHERE share_code = ?', [candidate]);
      if (!conflict) { code = candidate; break; }
    }
    await execute(
      `UPDATE playlists SET share_code = ?, is_collaborative = 1, updated_at = datetime('now') WHERE id = ?`,
      [code, id]
    );
  } else if (!row.is_collaborative) {
    await execute(
      `UPDATE playlists SET is_collaborative = 1, updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
  }

  res.json({ ok: true, shareCode: code, isCollaborative: true });
});

router.delete('/:id/share', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await queryOne('SELECT * FROM playlists WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Playlist not found' });
  if (!ownsPlaylist(row, req.userId)) return res.status(403).json({ error: 'Not your playlist' });

  await execute(
    `UPDATE playlists SET share_code = NULL, is_collaborative = 0, updated_at = datetime('now') WHERE id = ?`,
    [id]
  );

  res.json({ ok: true });
});

router.get('/:id/collaborators', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const row = await queryOne('SELECT * FROM playlists WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Playlist not found' });

  const isOwner = ownsPlaylist(row, req.userId);
  const isCollab = await isCollaborator(id, req.userId);
  if (!isOwner && !isCollab && !row.is_public) {
    return res.status(403).json({ error: 'Not allowed' });
  }

  res.json({ collaborators: await getCollaborators(id) });
});

router.delete('/:id/collaborators/:userId', requireUserId, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const targetUser = decodeURIComponent(req.params.userId);

  const row = await queryOne('SELECT * FROM playlists WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Playlist not found' });

  const isOwner = ownsPlaylist(row, req.userId);
  const isSelf = targetUser === req.userId;

  if (!isOwner && !isSelf) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  if (isOwner && targetUser === row.owner_id) {
    return res.status(400).json({ error: "Can't remove the owner" });
  }

  await execute(
    'DELETE FROM playlist_collaborators WHERE playlist_id = ? AND user_id = ?',
    [id, targetUser]
  );

  const remainingRow = await queryOne(
    'SELECT COUNT(*) AS c FROM playlist_collaborators WHERE playlist_id = ?',
    [id]
  );
  if ((remainingRow?.c ?? 0) === 0) {
    await execute(`UPDATE playlists SET is_collaborative = 0 WHERE id = ?`, [id]);
  }

  res.json({ ok: true });
});

export default router;
