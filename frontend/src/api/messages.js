// frontend/src/api/messages.js
import { apiGet, apiPost } from './client';

export async function sendMessage({ subject, body }) {
  return apiPost('/api/messages', { subject, body });
}

export async function getMyMessages() {
  const { messages } = await apiGet('/api/messages/mine');
  return messages || [];
}

export async function getThread(id) {
  return apiGet(`/api/messages/${id}`);
}

export async function replyToThread(id, body) {
  return apiPost(`/api/messages/${id}/reply`, { body });
}