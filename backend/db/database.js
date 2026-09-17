// backend/db/database.js
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'sonara.db');

export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    username              TEXT UNIQUE NOT NULL,
    email                 TEXT UNIQUE,
    password_hash         TEXT,
    display_name          TEXT,
    avatar_path           TEXT,
    bio                   TEXT,
    is_verified_artist    INTEGER NOT NULL DEFAULT 0,
    is_admin              INTEGER NOT NULL DEFAULT 0,
    is_managed_by_sonara  INTEGER NOT NULL DEFAULT 0,
    created_at            TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS albums (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    artist_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    source        TEXT NOT NULL DEFAULT 'local',
    source_id     TEXT,
    cover_path    TEXT,
    release_date  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist_id);`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tracks (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    title                 TEXT NOT NULL,
    artist_id             INTEGER REFERENCES users(id) ON DELETE SET NULL,
    album_id              INTEGER REFERENCES albums(id) ON DELETE SET NULL,
    duration              INTEGER,
    audio_path            TEXT,
    image_path            TEXT,
    source                TEXT NOT NULL DEFAULT 'local',
    source_id             TEXT,
    external_artist_id    TEXT,
    external_artist_name  TEXT,
    external_artist_image TEXT,
    created_at            TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_source ON tracks(source, source_id) WHERE source_id IS NOT NULL;`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_tracks_album  ON tracks(album_id);`);

db.exec(`
  CREATE TABLE IF NOT EXISTS playlists (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    description  TEXT,
    owner_id     TEXT NOT NULL,
    is_public    INTEGER NOT NULL DEFAULT 0,
    cover_path   TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS playlist_tracks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id  INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    track_source TEXT NOT NULL,
    track_ref_id TEXT NOT NULL,
    track_json   TEXT,
    position     INTEGER NOT NULL DEFAULT 0,
    added_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS favorites (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    track_source TEXT NOT NULL,
    track_ref_id TEXT NOT NULL,
    track_json   TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, track_source, track_ref_id)
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, created_at DESC);`);

db.exec(`
  CREATE TABLE IF NOT EXISTS listening_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT NOT NULL,
    track_source TEXT NOT NULL,
    track_ref_id TEXT NOT NULL,
    track_json   TEXT,
    track_title  TEXT,
    track_artist TEXT,
    track_image  TEXT,
    played_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_history_user_time ON listening_history(user_id, played_at DESC);`);

db.exec(`
  CREATE TABLE IF NOT EXISTS follows (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id  TEXT NOT NULL,
    followee_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(follower_id, followee_id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS display_name_requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested    TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at  TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS audio_cache (
    source       TEXT NOT NULL,
    source_id    TEXT NOT NULL,
    audio_url    TEXT NOT NULL,
    resolved_at  TEXT NOT NULL DEFAULT (datetime('now')),
    fail_count   INTEGER NOT NULL DEFAULT 0,
    last_fail_at TEXT,
    PRIMARY KEY (source, source_id)
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_audio_cache_source ON audio_cache(source, source_id);`);

db.exec(`
  CREATE TABLE IF NOT EXISTS artist_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    artist_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject     TEXT NOT NULL,
    body        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'open',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_artist_messages_status ON artist_messages(status, created_at DESC);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_artist_messages_artist ON artist_messages(artist_id, created_at DESC);`);

db.exec(`
  CREATE TABLE IF NOT EXISTS artist_message_replies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id  INTEGER NOT NULL REFERENCES artist_messages(id) ON DELETE CASCADE,
    author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_admin    INTEGER NOT NULL DEFAULT 0,
    body        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_replies_message ON artist_message_replies(message_id, created_at ASC);`);

// ---------- Playlist collaborators ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS playlist_collaborators (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id  INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    user_id      TEXT NOT NULL,
    added_at     TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(playlist_id, user_id)
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_collab_playlist ON playlist_collaborators(playlist_id);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_collab_user ON playlist_collaborators(user_id);`);

// ---------- Playlist folders ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS playlist_folders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id     TEXT NOT NULL,
    name         TEXT NOT NULL,
    position     INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_folders_owner ON playlist_folders(owner_id, position);`);

db.exec(`
  CREATE TABLE IF NOT EXISTS playlist_folder_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id    INTEGER NOT NULL REFERENCES playlist_folders(id) ON DELETE CASCADE,
    playlist_id  INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    position     INTEGER NOT NULL DEFAULT 0,
    added_at     TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(folder_id, playlist_id)
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_folder_items_folder ON playlist_folder_items(folder_id, position);`);

// ---------- Idempotent migrations ----------
function hasColumn(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === column);
}
function addColumnIfMissing(table, column, decl) {
  if (!hasColumn(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl};`);
    console.log(`[db] migrated: ${table}.${column}`);
  }
}

addColumnIfMissing('favorites', 'track_json', 'TEXT');
addColumnIfMissing('listening_history', 'track_json', 'TEXT');
addColumnIfMissing('playlist_tracks', 'track_json', 'TEXT');
addColumnIfMissing('users', 'is_managed_by_sonara', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('playlists', 'share_code', 'TEXT');
addColumnIfMissing('playlists', 'is_collaborative', 'INTEGER NOT NULL DEFAULT 0');

db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_playlists_share_code ON playlists(share_code) WHERE share_code IS NOT NULL;`);

console.log('[db] ready at', DB_PATH);

export default db;