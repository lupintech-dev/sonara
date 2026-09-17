// frontend/src/api/artist.js
import { apiGet, apiPost, apiDelete } from './client';
import { getToken } from '../utils/auth';

export async function applyAsArtist(artistName) {
  const { user } = await apiPost('/api/artist/apply', { artist_name: artistName });
  return user;
}

export async function getMyArtistProfile() {
  return apiGet('/api/artist/me');
}

export async function getArtistProfile(userId) {
  return apiGet(`/api/artist/${userId}`);
}

export async function getArtistAlbum(userId, albumId) {
  return apiGet(`/api/artist/${userId}/albums/${albumId}`);
}

export async function createAlbum({ name, coverPath, releaseDate }) {
  const { album } = await apiPost('/api/artist/albums', { name, coverPath, releaseDate });
  return album;
}

export async function deleteTrack(id) {
  return apiDelete(`/api/artist/tracks/${id}`);
}

export async function uploadTrack({ audioFile, imageFile, title, duration, albumId, albumName }) {
  const token = getToken();
  if (!token) throw new Error('Not logged in');

  const form = new FormData();
  form.append('audio', audioFile);
  if (imageFile) form.append('image', imageFile);
  form.append('title', title);
  if (duration) form.append('duration', String(Math.round(duration)));
  if (albumId) form.append('albumId', String(albumId));
  if (albumName) form.append('albumName', albumName);

  const res = await fetch('/api/artist/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data.track;
}