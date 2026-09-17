// backend/routes/upload.js
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { query, queryOne, execute } from '../db/turso.js';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safe = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext.slice(1)) ? ext : '.jpg';
    cb(null, `user-${req.user.id}-${Date.now()}${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

const router = Router();

// POST /api/upload/avatar  (multipart: field "avatar")
router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const publicPath = `/uploads/avatars/${req.file.filename}`;

  // Delete previous custom avatar (if it was a file, not a preset)
  const prev = (await queryOne('SELECT avatar_path FROM users WHERE id = ?', [req.user.id]))?.avatar_path;
  if (prev?.startsWith('/uploads/avatars/')) {
    const oldPath = path.join(__dirname, '..', prev);
    fs.unlink(oldPath, () => {});
  }

  (await execute('UPDATE users SET avatar_path = ? WHERE id = ?', [publicPath, req.user.id]));
  res.json({ avatar_path: publicPath });
});

// POST /api/upload/avatar/preset  { preset: 1..12 }
router.post('/avatar/preset', requireAuth, async (req, res) => {
  const { preset } = req.body || {};
  const n = parseInt(preset, 10);
  if (!Number.isInteger(n) || n < 1 || n > 12) {
    return res.status(400).json({ error: 'Preset must be 1–12' });
  }
  const publicPath = `/avatars/preset-${n}.svg`;

  // Delete old custom upload if any
  const prev = (await queryOne('SELECT avatar_path FROM users WHERE id = ?', [req.user.id]))?.avatar_path;
  if (prev?.startsWith('/uploads/avatars/')) {
    fs.unlink(path.join(__dirname, '..', prev), () => {});
  }

  (await execute('UPDATE users SET avatar_path = ? WHERE id = ?', [publicPath, req.user.id]));
  res.json({ avatar_path: publicPath });
});

export default router;