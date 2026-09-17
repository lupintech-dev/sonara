// frontend/src/api/follows.js
import { apiGet, apiPost, apiDelete } from './client';

export async function fetchFollowing() {
  const { following } = await apiGet('/api/follows/me/following');
  return following || [];
}
export async function followUser(userId) {
  return apiPost(`/api/follows/${userId}`);
}
export async function unfollowUser(userId) {
  return apiDelete(`/api/follows/${userId}`);
}
export async function getUserCounts(userId) {
  return apiGet(`/api/follows/users/${userId}`);
}
export async function searchUsers(q) {
  if (!q?.trim()) return [];
  const { users } = await apiGet(`/api/follows/search?q=${encodeURIComponent(q)}`);
  return users || [];
}