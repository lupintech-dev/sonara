// backend/middleware/userId.js
// Resolves the effective "owner" for a request.
// Priority: JWT userId > x-user-id header (device id) > anonymous
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

export function requireUserId(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.userId = `user:${payload.userId}`;
      req.authUserId = payload.userId;
      return next();
    } catch {
      // fall through to device id
    }
  }

  const deviceId = req.headers['x-user-id'];
  if (deviceId && typeof deviceId === 'string' && deviceId.length > 0) {
    req.userId = `device:${deviceId}`;
    return next();
  }

  return res.status(400).json({ error: 'No user identity (JWT or x-user-id required)' });
}