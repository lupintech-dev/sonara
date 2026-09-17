// frontend/src/api/history.js
import { apiGet, apiPost, apiDelete } from './client';

export async function fetchHistory({ limit = 50, unique = true } = {}) {
  const q = new URLSearchParams({ limit: String(limit), unique: unique ? '1' : '0' });
  const { entries } = await apiGet(`/api/history?${q}`);
  return entries || [];
}

export async function recordPlay(track) {
  return apiPost('/api/history', { track });
}

export async function clearHistory() {
  return apiDelete('/api/history');
}