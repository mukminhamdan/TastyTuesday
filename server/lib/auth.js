import jwt from 'jsonwebtoken';
import { getSetting } from '../db.js';
import { HttpError, forbidden } from './http.js';

export const COOKIE = 'bms_session';
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

function secret(db) {
  return process.env.JWT_SECRET || getSetting(db, '__jwt_secret');
}

export function issueSession(db, res, user) {
  const token = jwt.sign({ sub: user.id }, secret(db), { expiresIn: Math.floor(MAX_AGE_MS / 1000) });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

/** Attach req.user when a valid session cookie is present. */
export function loadUser(db) {
  return (req, _res, next) => {
    const token = req.cookies?.[COOKIE];
    if (token) {
      try {
        const payload = jwt.verify(token, secret(db));
        const user = db.prepare('SELECT id, name, email, role, active FROM users WHERE id = ?').get(payload.sub);
        if (user && user.active) req.user = user;
      } catch {
        /* invalid / expired token -> anonymous */
      }
    }
    next();
  };
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Sila log masuk', 'Please sign in'));
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Sila log masuk', 'Please sign in'));
  if (req.user.role !== 'admin') return next(forbidden());
  next();
}

/**
 * CSRF mitigation: state-changing API calls must carry a custom header,
 * which browsers will not send cross-site without a CORS preflight.
 */
export function csrfGuard(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'BMS') {
    return next(new HttpError(403, 'Permintaan ditolak', 'Request rejected'));
  }
  next();
}

/** Very small in-memory limiter for login attempts. */
const attempts = new Map();
export function loginLimiter(req, _res, next) {
  const key = req.ip;
  const now = Date.now();
  const rec = attempts.get(key) || { count: 0, reset: now + 15 * 60 * 1000 };
  if (now > rec.reset) {
    rec.count = 0;
    rec.reset = now + 15 * 60 * 1000;
  }
  rec.count++;
  attempts.set(key, rec);
  if (rec.count > 20) {
    return next(new HttpError(429, 'Terlalu banyak percubaan. Cuba lagi selepas 15 minit.', 'Too many attempts. Try again in 15 minutes.'));
  }
  next();
}
export function resetLoginLimiter(req) {
  attempts.delete(req.ip);
}
