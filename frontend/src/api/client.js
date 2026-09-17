// frontend/src/api/client.js
// Unified fetch wrapper. Injects either:
//   - Authorization: Bearer <JWT>   (if logged in)
//   - x-user-id: <device id>        (else — anonymous/device session)
import { getToken, getDeviceId } from '../utils/auth';

function authHeaders() {
  const token = getToken();
  if (token) return { Authorization: `Bearer ${token}` };
  return { 'x-user-id': getDeviceId() };
}

export async function apiFetch(path, options = {}) {
  const headers = {
    ...authHeaders(),
    ...(options.headers || {}),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const apiGet    = (path)         => apiFetch(path);
export const apiPost   = (path, body)   => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) });
export const apiDelete = (path)         => apiFetch(path, { method: 'DELETE' });