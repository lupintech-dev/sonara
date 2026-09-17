// frontend/src/api/playlists.js
import { apiGet, apiPost, apiDelete, apiFetch } from './client';

/* ---------- Playlists ---------- */

export async function listPlaylists() {
  const { playlists } = await apiGet('/api/playlists');
  return playlists || [];
}

export async function createPlaylist({ name, description, isPublic }) {
  const { playlist } = await apiPost('/api/playlists', { name, description, isPublic });
  return playlist;
}

export async function getPlaylist(id) {
  return apiGet(`/api/playlists/${id}`);
}

export async function updatePlaylist(id, patch) {
  const { playlist } = await apiFetch(`/api/playlists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return playlist;
}

export async function deletePlaylist(id) {
  return apiDelete(`/api/playlists/${id}`);
}

export async function addTrackToPlaylist(id, track) {
  return apiPost(`/api/playlists/${id}/tracks`, { track });
}

export async function removeTrackFromPlaylist(id, itemId) {
  return apiDelete(`/api/playlists/${id}/tracks/${itemId}`);
}

export async function reorderPlaylist(id, order) {
  return apiFetch(`/api/playlists/${id}/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}

/* ---------- Sharing / collaboration ---------- */

export async function generateShareCode(id) {
  const { shareCode } = await apiPost(`/api/playlists/${id}/share`);
  return shareCode;
}

export async function revokeShareCode(id) {
  return apiDelete(`/api/playlists/${id}/share`);
}

export async function joinPlaylist(code) {
  return apiPost(`/api/playlists/join/${encodeURIComponent(code)}`);
}

export async function getCollaborators(id) {
  const { collaborators } = await apiGet(`/api/playlists/${id}/collaborators`);
  return collaborators || [];
}

export async function removeCollaborator(id, userId) {
  return apiDelete(`/api/playlists/${id}/collaborators/${encodeURIComponent(userId)}`);
}

/* ---------- Folders ---------- */

export async function listFolders() {
  const { folders } = await apiGet('/api/playlists/folders');
  return folders || [];
}

export async function createFolder(name) {
  const { folder } = await apiPost('/api/playlists/folders', { name });
  return folder;
}

export async function renameFolder(id, name) {
  return apiFetch(`/api/playlists/folders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteFolder(id) {
  return apiDelete(`/api/playlists/folders/${id}`);
}

export async function addPlaylistToFolder(folderId, playlistId) {
  return apiPost(`/api/playlists/folders/${folderId}/playlists`, { playlistId });
}

export async function removePlaylistFromFolder(folderId, playlistId) {
  return apiDelete(`/api/playlists/folders/${folderId}/playlists/${playlistId}`);
}

export async function reorderFolder(folderId, order) {
  return apiFetch(`/api/playlists/folders/${folderId}/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ order }),
  });
}