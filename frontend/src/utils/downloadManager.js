// frontend/src/utils/downloadManager.js
// IndexedDB storage for offline audio — scoped per user (Spotify-style).
// Keys are stored as: "<ownerKey>|<trackId>"
//   ownerKey = "user:42" for logged-in user 42
//   ownerKey = "anon"    for anonymous / logged-out
//
// This means each account on the same device has its own library.

const DB_NAME = 'sonara_offline';
const DB_VERSION = 1;
const STORE_BLOBS = 'audio_blobs';
const STORE_META  = 'track_meta';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS);
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };
    req.onsuccess = async () => {
      const db = req.result;
      await purgeLegacyKeys(db);
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/* One-time cleanup: any pre-owner-scoping keys (no '|' in them) get dropped.
   Silent, cheap — runs on first open every session but only does work once. */
async function purgeLegacyKeys(db) {
  try {
    for (const storeName of [STORE_BLOBS, STORE_META]) {
      await new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.getAllKeys();
        req.onsuccess = () => {
          const keys = req.result || [];
          for (const k of keys) {
            if (typeof k === 'string' && !k.includes('|')) {
              try { store.delete(k); } catch {}
            }
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch {}
}

function reqWrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* Build the storage key for one (owner, track) pair. */
function key(owner, trackId) {
  return `${owner}|${trackId}`;
}

/* Split a raw key back into { owner, trackId }. */
function parseKey(raw) {
  if (typeof raw !== 'string') return { owner: null, trackId: null };
  const idx = raw.indexOf('|');
  if (idx < 0) return { owner: null, trackId: raw };
  return { owner: raw.slice(0, idx), trackId: raw.slice(idx + 1) };
}

/* -------------------------------------------------------------
   Public API — every method takes an `owner` string first
   ------------------------------------------------------------- */

export async function hasDownload(owner, trackId) {
  const db = await openDB();
  const meta = await reqWrap(
    db.transaction(STORE_META, 'readonly').objectStore(STORE_META).get(key(owner, trackId))
  );
  return !!meta;
}

export async function saveDownload(owner, track, blob) {
  const db = await openDB();
  const k = key(owner, track.id);
  const tx = db.transaction([STORE_BLOBS, STORE_META], 'readwrite');
  tx.objectStore(STORE_BLOBS).put(blob, k);
  tx.objectStore(STORE_META).put({ track, size: blob.size, savedAt: Date.now() }, k);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve({ ok: true, size: blob.size });
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTrackBlob(owner, trackId) {
  const db = await openDB();
  return reqWrap(
    db.transaction(STORE_BLOBS, 'readonly').objectStore(STORE_BLOBS).get(key(owner, trackId))
  );
}

export async function getTrackMeta(owner, trackId) {
  const db = await openDB();
  return reqWrap(
    db.transaction(STORE_META, 'readonly').objectStore(STORE_META).get(key(owner, trackId))
  );
}

/* List every download for a specific owner. */
export async function listDownloads(owner) {
  const db = await openDB();
  const entries = await reqWrap(
    db.transaction(STORE_META, 'readonly').objectStore(STORE_META).getAll()
  );
  const keys = await reqWrap(
    db.transaction(STORE_META, 'readonly').objectStore(STORE_META).getAllKeys()
  );

  const prefix = `${owner}|`;
  const out = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (typeof k !== 'string' || !k.startsWith(prefix)) continue;
    const { trackId } = parseKey(k);
    out.push({ trackId, ...entries[i] });
  }
  return out.sort((a, b) => b.savedAt - a.savedAt);
}

export async function deleteDownload(owner, trackId) {
  const db = await openDB();
  const k = key(owner, trackId);
  const tx = db.transaction([STORE_BLOBS, STORE_META], 'readwrite');
  tx.objectStore(STORE_BLOBS).delete(k);
  tx.objectStore(STORE_META).delete(k);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve({ ok: true });
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllDownloads(owner) {
  const db = await openDB();
  const prefix = `${owner}|`;

  // Find keys belonging to this owner
  const metaKeys = await reqWrap(
    db.transaction(STORE_META, 'readonly').objectStore(STORE_META).getAllKeys()
  );
  const mine = metaKeys.filter(k => typeof k === 'string' && k.startsWith(prefix));

  const tx = db.transaction([STORE_BLOBS, STORE_META], 'readwrite');
  const blobs = tx.objectStore(STORE_BLOBS);
  const metas = tx.objectStore(STORE_META);
  for (const k of mine) {
    blobs.delete(k);
    metas.delete(k);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve({ ok: true, removed: mine.length });
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTotalSize(owner) {
  const list = await listDownloads(owner);
  return list.reduce((sum, m) => sum + (m.size || 0), 0);
}

/**
 * Group meta entries by owner. Returns array of
 *   { owner, count, size, sampleTrackIds }
 * Excludes the currentOwner if passed.
 */
export async function listOwners({ excludeOwner = null } = {}) {
  const db = await openDB();
  const metas = await reqWrap(
    db.transaction(STORE_META, 'readonly').objectStore(STORE_META).getAll()
  );
  const keys = await reqWrap(
    db.transaction(STORE_META, 'readonly').objectStore(STORE_META).getAllKeys()
  );

  const groups = new Map();
  for (let i = 0; i < keys.length; i++) {
    const { owner, trackId } = parseKey(keys[i]);
    if (!owner) continue;
    if (excludeOwner && owner === excludeOwner) continue;
    const m = metas[i];
    const g = groups.get(owner) || { owner, count: 0, size: 0, sampleTrackIds: [] };
    g.count += 1;
    g.size += m?.size || 0;
    if (g.sampleTrackIds.length < 3) g.sampleTrackIds.push(trackId);
    groups.set(owner, g);
  }

  return [...groups.values()].sort((a, b) => b.size - a.size);
}

/** Delete every download that doesn't belong to currentOwner. */
export async function clearOtherOwners(currentOwner) {
  const db = await openDB();
  const keys = await reqWrap(
    db.transaction(STORE_META, 'readonly').objectStore(STORE_META).getAllKeys()
  );
  const prefix = `${currentOwner}|`;
  const others = keys.filter(k => typeof k === 'string' && k.includes('|') && !k.startsWith(prefix));

  const tx = db.transaction([STORE_BLOBS, STORE_META], 'readwrite');
  const blobs = tx.objectStore(STORE_BLOBS);
  const metas = tx.objectStore(STORE_META);
  for (const k of others) {
    blobs.delete(k);
    metas.delete(k);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve({ ok: true, removed: others.length });
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Stream-download a track's audio and store it under the given owner.
 */
export async function downloadTrack(owner, track, onProgress) {
  const url = track.audio || track.audioUrl;
  if (!url) throw new Error('Track has no audio URL');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);

  const total = parseInt(res.headers.get('content-length') || '0', 10);
  const reader = res.body?.getReader();

  if (!reader) {
    const blob = await res.blob();
    await saveDownload(owner, track, blob);
    if (onProgress) onProgress(1);
    return { size: blob.size };
  }

  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (onProgress && total > 0) onProgress(received / total);
  }

  const blob = new Blob(chunks, { type: res.headers.get('content-type') || 'audio/mpeg' });
  if (onProgress) onProgress(1);

  await saveDownload(owner, track, blob);
  return { size: blob.size };
}