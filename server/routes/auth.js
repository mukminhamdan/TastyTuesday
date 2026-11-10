import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { issueSession, clearSession, requireAuth, loginLimiter, resetLoginLimiter } from '../lib/auth.js';
import { bad, str, isEmail, HttpError } from '../lib/http.js';
import { logActivity } from '../lib/activity.js';
import { getSettings } from '../db.js';

export function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) {
    throw bad('Kata laluan mestilah sekurang-kurangnya 8 aksara', 'Password must be at least 8 characters');
  }
}

export default function authRoutes(db) {
  const r = Router();
  const userCount = () => db.prepare('SELECT COUNT(*) AS n FROM users').get().n;

  r.get('/status', (req, res) => {
    const s = getSettings(db);
    const needsSetup = userCount() === 0;
    res.json({ needsSetup, setupCodeRequired: needsSetup && !!process.env.SETUP_CODE, user: req.user || null, branding: { business_name: s.business_name, logo: s.logo } });
  });

  // First-run: create the initial administrator account.
  r.post('/setup', loginLimiter, (req, res) => {
    if (userCount() > 0) throw new HttpError(409, 'Sistem sudah disediakan', 'System is already set up');
    // On a public server, SETUP_CODE stops strangers from claiming the admin account first.
    if (process.env.SETUP_CODE && String(req.body.setup_code || '').trim() !== process.env.SETUP_CODE) {
      throw new HttpError(403, 'Kod persediaan tidak betul', 'Incorrect setup code');
    }
    const name = str(req.body.name, 120);
    const email = str(req.body.email, 200);
    if (!name) throw bad('Nama diperlukan', 'Name is required');
    if (!isEmail(email)) throw bad('E-mel tidak sah', 'Invalid email');
    validatePassword(req.body.password);
    const hash = bcrypt.hashSync(req.body.password, 10);
    const info = db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')").run(name, email, hash);
    if (req.body.business_name) {
      db.prepare("UPDATE settings SET value = ? WHERE key = 'business_name'").run(JSON.stringify(str(req.body.business_name, 200)));
    }
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(info.lastInsertRowid);
    issueSession(db, res, user);
    logActivity(db, user, { entity_type: 'user', entity_id: user.id, action: 'setup', description: 'Akaun pentadbir dicipta' });
    res.status(201).json({ user });
  });

  r.post('/login', loginLimiter, (req, res) => {
    const email = str(req.body.email, 200);
    const row = email ? db.prepare('SELECT * FROM users WHERE email = ?').get(email) : null;
    if (!row || !row.active || !bcrypt.compareSync(String(req.body.password || ''), row.password_hash)) {
      throw new HttpError(401, 'E-mel atau kata laluan tidak betul', 'Incorrect email or password');
    }
    resetLoginLimiter(req);
    db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(row.id);
    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    issueSession(db, res, user);
    res.json({ user });
  });

  r.post('/logout', (req, res) => {
    clearSession(res);
    res.json({ ok: true });
  });

  r.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

  r.post('/change-password', requireAuth, (req, res) => {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(String(req.body.current_password || ''), row.password_hash)) {
      throw bad('Kata laluan semasa tidak betul', 'Current password is incorrect');
    }
    validatePassword(req.body.new_password);
    db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?').run(bcrypt.hashSync(req.body.new_password, 10), row.id);
    // Other sessions are signed out; keep this one signed in with a fresh token.
    issueSession(db, res, req.user);
    res.json({ ok: true });
  });

  return r;
}
