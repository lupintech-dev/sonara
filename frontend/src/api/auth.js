// frontend/src/api/auth.js
import { saveSession, clearSession, getToken } from '../utils/auth';

const base = '/api/auth';

async function post(path, body) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function register({ username, email, password, display_name }) {
  const data = await post('/register', { username, email, password, display_name });
  saveSession(data.token, data.user);
  return data;
}

export async function login({ username, password }) {
  const data = await post('/login', { username, password });
  saveSession(data.token, data.user);
  return data;
}

export async function fetchMe() {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(base + '/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
}

export function logout() {
  clearSession();
}