// backend/routes/upload.js
import { Router } from 'express';
import multer from 'multer';
import { queryOne, execute } from '../db/turso.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadBuffer, deleteAsset, publicIdFromUrl } from '../services/cloudUpload.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// POST /api/upload/avatar  (multipart: field "avatar")
router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = (req.file.originalname.match(/\.[^.]+$/)?.[0] || '.jpg').toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext.slice(1)) ? ext : '.jpg';

  let uploaded;
  try {
    uploaded = await uploadBuffer(req.file.buffer, {
      folder: 'sonara/avatars',
      resourceType: 'image',
      publicId: `user-${req.user.id}-${Date.now()}`,
      format: safeExt.slice(1),
    });
  } catch (err) {
    console.error('[upload] avatar failed:', err.message);
    return res.status(500).json({ error: 'Avatar upload failed' });
  }

  // Delete previous custom avatar from Cloudinary (if any)
  const prev = (await queryOne('SELECT avatar_path FROM users WHERE id = ?', [req.user.id]))?.avatar_path;
  if (prev) {
    const info = publicIdFromUrl(prev);
    if (info) await deleteAsset(info.publicId, info.resourceType);
  }

  await execute('UPDATE users SET avatar_path = ? WHERE id = ?', [uploaded.url, req.user.id]);
  res.json({ avatar_path: uploaded.url });
});

// POST /api/upload/avatar/preset  { preset: 1..12 }
router.post('/avatar/preset', requireAuth, async (req, res) => {
  const { preset } = req.body || {};
  const n = parseInt(preset, 10);
  if (!Number.isInteger(n) || n < 1 || n > 12) {
    return res.status(400).json({ error: 'Preset must be 1-12' });
  }
  const publicPath = `/avatars/preset-${n}.svg`;

  const prev = (await queryOne('SELECT avatar_path FROM users WHERE id = ?', [req.user.id]))?.avatar_path;
  if (prev) {
    const info = publicIdFromUrl(prev);
    if (info) await deleteAsset(info.publicId, info.resourceType);
  }

  await execute('UPDATE users SET avatar_path = ? WHERE id = ?', [publicPath, req.user.id]);
  res.json({ avatar_path: publicPath });
});

export default router;
