// frontend/src/utils/likeStorage.js
// Owner-scoped local storage for likes, search history, and settings.

const LIKES_PREFIX = 'sonara_likes_';
const SEARCH_PREFIX = 'sonara_search_history_';
const SETTINGS_PREFIX = 'sonara_settings_';

// One-time cleanup of old device-wide keys
try {
  localStorage.removeItem('sonara_likes');
  localStorage.removeItem('sonara_search_history');
  localStorage.removeItem('sonara_settings');
} catch {}

export function ownerOf(user) {
  return user?.id ? `user:${user.id}` : 'anon';
}

/* ---------- Likes ---------- */
export function loadLikes(owner) {
  try {
    const raw = localStorage.getItem(`${LIKES_PREFIX}${owner}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveLikes(owner, likes) {
  try { localStorage.setItem(`${LIKES_PREFIX}${owner}`, JSON.stringify(likes)); } catch {}
}

/* ---------- Search History ---------- */
export function loadSearchHistory(owner) {
  try {
    const raw = localStorage.getItem(`${SEARCH_PREFIX}${owner}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveSearchHistory(owner, list) {
  try { localStorage.setItem(`${SEARCH_PREFIX}${owner}`, JSON.stringify(list)); } catch {}
}

/* ---------- Settings ---------- */
export function loadSettings(owner) {
  try {
    const raw = localStorage.getItem(`${SETTINGS_PREFIX}${owner}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveSettings(owner, settings) {
  try { localStorage.setItem(`${SETTINGS_PREFIX}${owner}`, JSON.stringify(settings)); } catch {}
}