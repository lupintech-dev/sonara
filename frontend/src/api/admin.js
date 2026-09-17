// frontend/src/api/admin.js
import { apiGet, apiPost, apiDelete } from './client';
import { getToken } from '../utils/auth';

export async function getStats() {
  const { stats } = await apiGet('/api/admin/stats');
  return stats;
}

/* ---------- Users ---------- */

export async function getUsers(q = '', limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (q) params.set('q', q);
  const { users } = await apiGet(`/api/admin/users?${params}`);
  return users || [];
}

export async function verifyArtist(id)    { return apiPost(`/api/admin/users/${id}/verify-artist`); }
export async function unverifyArtist(id)  { return apiPost(`/api/admin/users/${id}/unverify-artist`); }
export async function grantAdmin(id)      { return apiPost(`/api/admin/users/${id}/grant-admin`); }
export async function revokeAdmin(id)     { return apiPost(`/api/admin/users/${id}/revoke-admin`); }

export async function deleteUser(id, { force = false } = {}) {
  const path = force ? `/api/admin/users/${id}?force=1` : `/api/admin/users/${id}`;
  return apiDelete(path);
}

/* ---------- Uploads ---------- */

export async function uploadSingleTrack({ audioFile, imageFile, title, artistName, albumName, duration }) {
  const token = getToken();
  if (!token) throw new Error('Not logged in');

  const form = new FormData();
  form.append('audio', audioFile);
  if (imageFile) form.append('image', imageFile);
  form.append('title', title);
  form.append('artistName', artistName);
  if (albumName) form.append('albumName', albumName);
  if (duration) form.append('duration', String(Math.round(duration)));

  const res = await fetch('/api/admin/upload/track', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data.track;
}

export async function uploadZip(zipFile, onProgress) {
  const token = getToken();
  if (!token) throw new Error('Not logged in');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload/zip');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.error || `Upload failed (${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));

    const form = new FormData();
    form.append('zip', zipFile);
    xhr.send(form);
  });
}

export async function bulkCreateArtists(names) {
  return apiPost('/api/admin/artists/bulk', { names });
}

/* ---------- Messages ---------- */

export async function getMessages(status = 'open') {
  const { messages } = await apiGet(`/api/admin/messages?status=${encodeURIComponent(status)}`);
  return messages || [];
}

export async function getMessage(id) {
  return apiGet(`/api/admin/messages/${id}`);
}

export async function replyToMessage(id, body) {
  return apiPost(`/api/admin/messages/${id}/reply`, { body });
}

export async function resolveMessage(id) {
  return apiPost(`/api/admin/messages/${id}/resolve`);
}

export async function reopenMessage(id) {
  return apiPost(`/api/admin/messages/${id}/reopen`);
}

/* ---------- Activity ---------- */

export async function getActivity(limit = 30) {
  return apiGet(`/api/admin/activity?limit=${limit}`);
}