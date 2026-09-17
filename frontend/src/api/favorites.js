// frontend/src/api/favorites.js
import { apiGet, apiPost, apiDelete } from './client';

export async function fetchFavorites() {
  const { tracks } = await apiGet('/api/favorites');
  return tracks || [];
}

export async function addFavorite(track) {
  return apiPost('/api/favorites', { track });
}

export async function removeFavorite(track) {
  return apiDelete(`/api/favorites/${encodeURIComponent(track.source)}/${encodeURIComponent(track.sourceId)}`);
}