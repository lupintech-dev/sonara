// frontend/src/api/upload.js
import { getToken } from '../utils/auth';

export async function uploadAvatar(file) {
  const token = getToken();
  if (!token) throw new Error('Not logged in');

  const form = new FormData();
  form.append('avatar', file);

  const res = await fetch('/api/upload/avatar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.avatar_path;
}

export async function pickPresetAvatar(preset) {
  const token = getToken();
  const res = await fetch('/api/upload/avatar/preset', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ preset }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Preset failed');
  return data.avatar_path;
}