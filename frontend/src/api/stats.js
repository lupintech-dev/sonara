// frontend/src/api/stats.js
import { apiGet } from './client';

export async function getMyStats() {
  return apiGet('/api/stats/me');
}