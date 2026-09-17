// frontend/src/api/aiPlaylist.js
import { apiPost } from './client';

export async function generateAIPlaylist(prompt, limit = 20) {
  const data = await apiPost('/api/aiPlaylist/generate', { prompt, limit });
  return data; // { concept: { name, description, queries }, tracks: [...] }
}
