// frontend/src/api/users.js
import { apiGet } from './client';

export async function fetchUserProfile(userId) {
  return apiGet(`/api/artist/${userId}`);
}