// frontend/src/api/profile.js
import { apiFetch } from './client';

export async function updateProfile(patch) {
  const { user } = await apiFetch('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  return user;
}