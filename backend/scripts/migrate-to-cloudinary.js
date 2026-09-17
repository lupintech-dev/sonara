import { v2 as cloudinary } from 'cloudinary';
import { query, execute } from '../db/turso.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('Missing Cloudinary credentials in .env');
  process.exit(1);
}

function uploadFile(localPath, folder, resourceType = 'image') {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(localPath, {
      folder,
      resource_type: resourceType,
      unique_filename: true,
    }, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
    });
  });
}

async function main() {
  const t0 = Date.now();
  console.log('=== Sonara Cloudinary Migration ===\n');
  console.log('Cloudinary cloud:', process.env.CLOUDINARY_CLOUD_NAME, '\n');

  // --- 1. Audio files ---
  console.log('[1/4] Migrating track audio...');
  const audioTracks = await query(
    `SELECT id, title, audio_path FROM tracks WHERE source = 'local' AND audio_path LIKE '/uploads/audio/%'`,
    []
  );
  console.log(`  Found ${audioTracks.length}`);

  let ok = 0, skip = 0, fail = 0;
  for (const t of audioTracks) {
    const filename = path.basename(t.audio_path);
    const localPath = path.join(UPLOADS_DIR, 'audio', filename);
    if (!fs.existsSync(localPath)) {
      console.warn(`  - [${t.id}] ${t.title} — file missing on disk`);
      skip++; continue;
    }
    try {
      const url = await uploadFile(localPath, 'sonara/audio', 'video');
      await execute('UPDATE tracks SET audio_path = ? WHERE id = ?', [url, t.id]);
      console.log(`  + [${t.id}] ${t.title}`);
      ok++;
    } catch (err) {
      console.error(`  ! [${t.id}] ${t.title}: ${err.message}`);
      fail++;
    }
  }
  console.log(`  Result: ${ok} ok, ${skip} skipped, ${fail} failed\n`);

  // --- 2. Track cover images ---
  console.log('[2/4] Migrating track covers...');
  const trackCovers = await query(
    `SELECT id, title, image_path FROM tracks WHERE image_path LIKE '/uploads/images/%'`,
    []
  );
  console.log(`  Found ${trackCovers.length}`);

  let cOk = 0, cSkip = 0, cFail = 0;
  for (const t of trackCovers) {
    const filename = path.basename(t.image_path);
    const localPath = path.join(UPLOADS_DIR, 'images', filename);
    if (!fs.existsSync(localPath)) {
      console.warn(`  - [${t.id}] ${t.title} — file missing`);
      cSkip++; continue;
    }
    try {
      const url = await uploadFile(localPath, 'sonara/covers', 'image');
      await execute('UPDATE tracks SET image_path = ? WHERE id = ?', [url, t.id]);
      console.log(`  + [${t.id}] ${t.title}`);
      cOk++;
    } catch (err) {
      console.error(`  ! [${t.id}] ${t.title}: ${err.message}`);
      cFail++;
    }
  }
  console.log(`  Result: ${cOk} ok, ${cSkip} skipped, ${cFail} failed\n`);

  // --- 3. Album covers ---
  console.log('[3/4] Migrating album covers...');
  const albumCovers = await query(
    `SELECT id, name, cover_path FROM albums WHERE cover_path LIKE '/uploads/images/%'`,
    []
  );
  console.log(`  Found ${albumCovers.length}`);

  let aOk = 0, aSkip = 0, aFail = 0;
  for (const a of albumCovers) {
    const filename = path.basename(a.cover_path);
    const localPath = path.join(UPLOADS_DIR, 'images', filename);
    if (!fs.existsSync(localPath)) {
      aSkip++; continue;
    }
    try {
      const url = await uploadFile(localPath, 'sonara/covers', 'image');
      await execute('UPDATE albums SET cover_path = ? WHERE id = ?', [url, a.id]);
      console.log(`  + [${a.id}] ${a.name}`);
      aOk++;
    } catch (err) {
      console.error(`  ! [${a.id}] ${a.name}: ${err.message}`);
      aFail++;
    }
  }
  console.log(`  Result: ${aOk} ok, ${aSkip} skipped, ${aFail} failed\n`);

  // --- 4. User avatars ---
  console.log('[4/4] Migrating user avatars...');
  const avatars = await query(
    `SELECT id, username, avatar_path FROM users WHERE avatar_path LIKE '/uploads/avatars/%'`,
    []
  );
  console.log(`  Found ${avatars.length}`);

  let uOk = 0, uSkip = 0, uFail = 0;
  for (const u of avatars) {
    const filename = path.basename(u.avatar_path);
    const localPath = path.join(UPLOADS_DIR, 'avatars', filename);
    if (!fs.existsSync(localPath)) {
      uSkip++; continue;
    }
    try {
      const url = await uploadFile(localPath, 'sonara/avatars', 'image');
      await execute('UPDATE users SET avatar_path = ? WHERE id = ?', [url, u.id]);
      console.log(`  + [${u.id}] ${u.username}`);
      uOk++;
    } catch (err) {
      console.error(`  ! [${u.id}] ${u.username}: ${err.message}`);
      uFail++;
    }
  }
  console.log(`  Result: ${uOk} ok, ${uSkip} skipped, ${uFail} failed\n`);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('=== Migration complete ===');
  console.log(`Total time: ${elapsed}s`);
  console.log(`Migrated: ${ok} audio, ${cOk} track covers, ${aOk} album covers, ${uOk} avatars`);

  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
