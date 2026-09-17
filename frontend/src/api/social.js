// frontend/src/api/social.js
import { apiGet } from './client';

// Current user's counts (pass user.id from auth)
export async function getCounts(userId) {
  return apiGet(`/api/follows/users/${userId}`);
}

// Current user's follower / following lists
export async function getFollowers(userId) {
  const { users } = await apiGet(`/api/follows/users/${userId}/followers`);
  return users || [];
}
export async function getFollowing(userId) {
  const { users } = await apiGet(`/api/follows/users/${userId}/following`);
  return users || [];
}

// Public — same endpoints, any user
export async function getUserFollowers(userId) {
  return getFollowers(userId);
}
export async function getUserFollowing(userId) {
  return getFollowing(userId);
}