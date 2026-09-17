// backend/routes/messages.js
import { Router } from 'express';
import { query, queryOne, execute } from '../db/turso.js';
import { requireVerifiedArtist } from '../middleware/auth.js';

const router = Router();

router.post('/', requireVerifiedArtist, async (req, res) => {
  const subject = (req.body?.subject || '').toString().trim();
  const body = (req.body?.body || '').toString().trim();

  if (!subject || subject.length > 200) {
    return res.status(400).json({ error: 'Subject required (max 200 chars)' });
  }
  if (!body || body.length > 5000) {
    return res.status(400).json({ error: 'Message required (max 5000 chars)' });
  }

  const r = (await execute(`
    INSERT INTO artist_messages (artist_id, subject, body)
    VALUES (?, ?, ?)
  `, [req.user.id, subject, body]));

  res.status(201).json({ ok: true, id: Number(r.lastInsertRowid) });
});

router.get('/mine', requireVerifiedArtist, async (req, res) => {
  const rows = (await query(`
    SELECT m.*,
      (SELECT COUNT(*) FROM artist_message_replies r WHERE r.message_id = m.id) AS reply_count
    FROM artist_messages m
    WHERE m.artist_id = ?
    ORDER BY m.updated_at DESC
  `, [req.user.id]));

  res.json({
    messages: rows.map(m => ({
      id: m.id,
      subject: m.subject,
      body: m.body,
      status: m.status,
      replyCount: m.reply_count,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    })),
  });
});

router.get('/:id', requireVerifiedArtist, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const m = (await queryOne('SELECT * FROM artist_messages WHERE id = ?', [id]));
  if (!m) return res.status(404).json({ error: 'Not found' });
  if (m.artist_id !== req.user.id && !req.user.is_admin) {
    return res.status(403).json({ error: 'Not yours' });
  }

  const replies = (await query(`
    SELECT r.*, u.username, u.display_name, u.avatar_path
    FROM artist_message_replies r
    LEFT JOIN users u ON u.id = r.author_id
    WHERE r.message_id = ?
    ORDER BY r.created_at ASC
  `, [id]));

  res.json({
    message: {
      id: m.id, subject: m.subject, body: m.body,
      status: m.status, createdAt: m.created_at,
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

router.post('/:id/reply', requireVerifiedArtist, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = (req.body?.body || '').toString().trim();
  if (!body) return res.status(400).json({ error: 'Body required' });

  const m = (await queryOne('SELECT * FROM artist_messages WHERE id = ?', [id]));
  if (!m) return res.status(404).json({ error: 'Not found' });
  if (m.artist_id !== req.user.id) return res.status(403).json({ error: 'Not yours' });

  (await execute(`
    INSERT INTO artist_message_replies (message_id, author_id, is_admin, body)
    VALUES (?, ?, 0, ?)
  `, [id, req.user.id, body]));

  (await execute(`UPDATE artist_messages SET updated_at = datetime('now') WHERE id = ?`, [id]));
  res.status(201).json({ ok: true });
});

export default router;