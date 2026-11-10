import { Router } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { requireAdmin } from '../lib/auth.js';
import { bad, notFound, conflict, str, intId, isEmail, sen, HttpError } from '../lib/http.js';
import { getSettings, setSetting, DEFAULT_SETTINGS, TABLES, DATA_DIR } from '../db.js';
import { logActivity } from '../lib/activity.js';
import { validatePassword } from './auth.js';
import { sweepStatuses } from '../lib/finance.js';
import { peekNumbers, setNextNumber } from '../lib/numbering.js';
import { today } from '../lib/http.js';

const NUMBER_KEYS = ['quotation_validity_days', 'payment_terms_days', 'deposit_percent', 'tax_rate_default'];
const BOOL_KEYS = ['tax_enabled_default', 'number_include_year'];
const LIST_KEYS = ['customer_categories', 'event_types'];
const TEMPLATES = ['modern', 'classic', 'minimal', 'boxed'];

export function settingsRoutes(db) {
  const r = Router();

  r.get('/', (req, res) => res.json(getSettings(db)));

  // Document sequences: see the next number, or move it forward (never backwards).
  r.get('/counters', (req, res) => res.json(peekNumbers(db, today())));
  r.put('/counters', requireAdmin, (req, res) => {
    const types = ['customer', 'booking', 'quotation', 'invoice', 'receipt'];
    const updates = Object.entries(req.body || {}).filter(([k]) => types.includes(k));
    db.transaction(() => {
      for (const [type, value] of updates) {
        const next = Number(value);
        const r2 = setNextNumber(db, type, today(), next);
        if (!r2.ok) {
          throw bad(
            `Nombor seterusnya untuk ${type} mestilah sekurang-kurangnya ${r2.last + 1} (nombor tidak boleh digunakan semula)`,
            `Next ${type} number must be at least ${r2.last + 1} (numbers cannot be reused)`,
          );
        }
      }
      if (updates.length) logActivity(db, req.user, { entity_type: 'settings', action: 'updated', description: 'Nombor dokumen seterusnya dikemas kini' });
    })();
    res.json(peekNumbers(db, today()));
  });

  r.put('/', requireAdmin, (req, res) => {
    const body = req.body || {};
    const updates = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (!(key in body)) continue;
      let v = body[key];
      if (NUMBER_KEYS.includes(key)) {
        v = Number(v);
        if (!Number.isFinite(v) || v < 0 || v > (key.endsWith('days') ? 3650 : 100)) throw bad(`Nilai tidak sah: ${key}`, `Invalid value: ${key}`);
      } else if (BOOL_KEYS.includes(key)) {
        v = !!v;
      } else if (LIST_KEYS.includes(key)) {
        if (!Array.isArray(v)) throw bad(`Senarai tidak sah: ${key}`, `Invalid list: ${key}`);
        v = v.map((x) => str(x, 100)).filter(Boolean).slice(0, 50);
      } else if (key === 'logo') {
        v = String(v || '');
        if (v && !/^data:image\/(png|jpeg);base64,/.test(v)) throw bad('Logo mestilah imej PNG atau JPEG', 'Logo must be a PNG or JPEG image');
        if (v.length > 1_500_000) throw bad('Logo terlalu besar (maksimum 1MB)', 'Logo is too large (max 1MB)');
      } else if (key === 'doc_template') {
        if (!TEMPLATES.includes(v)) v = 'modern';
      } else if (key === 'accent_color') {
        if (!/^#[0-9a-fA-F]{6}$/.test(String(v))) v = DEFAULT_SETTINGS.accent_color;
      } else if (key === 'default_language') {
        v = v === 'en' ? 'en' : 'ms';
      } else if (key.startsWith('prefix_')) {
        v = String(v || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/^-+|-+$/g, '').slice(0, 10);
        if (!v && key === 'prefix_customer') throw bad('Awalan nombor pelanggan tidak boleh kosong', 'Customer number prefix cannot be empty');
      } else {
        v = str(v, 10000) ?? '';
      }
      updates[key] = v;
    }
    if (updates.business_name === '') throw bad('Nama perniagaan diperlukan', 'Business name is required');
    db.transaction(() => {
      for (const [k, v] of Object.entries(updates)) setSetting(db, k, v);
      logActivity(db, req.user, { entity_type: 'settings', action: 'updated', description: 'Tetapan perniagaan dikemas kini' });
    })();
    res.json(getSettings(db));
  });

  return r;
}

export function serviceRoutes(db) {
  const r = Router();
  const fields = (b) => {
    const name = str(b.name, 200);
    if (!name) throw bad('Nama servis diperlukan', 'Service name is required');
    return { name, description: str(b.description, 2000), unit: str(b.unit, 40), unit_price: sen(b.unit_price, 'Harga', 'Price'), is_package: b.is_package ? 1 : 0, active: b.active === false ? 0 : 1 };
  };
  r.get('/', (req, res) => res.json(db.prepare('SELECT * FROM services ORDER BY active DESC, is_package DESC, name').all()));
  r.post('/', requireAdmin, (req, res) => {
    const info = db.prepare('INSERT INTO services (name, description, unit, unit_price, is_package, active) VALUES (@name, @description, @unit, @unit_price, @is_package, @active)').run(fields(req.body));
    res.status(201).json(db.prepare('SELECT * FROM services WHERE id = ?').get(info.lastInsertRowid));
  });
  r.put('/:id', requireAdmin, (req, res) => {
    const id = intId(req.params.id);
    if (!db.prepare('SELECT 1 FROM services WHERE id = ?').get(id)) throw notFound('Servis', 'Service');
    db.prepare('UPDATE services SET name=@name, description=@description, unit=@unit, unit_price=@unit_price, is_package=@is_package, active=@active WHERE id=@id').run({ ...fields(req.body), id });
    res.json(db.prepare('SELECT * FROM services WHERE id = ?').get(id));
  });
  r.delete('/:id', requireAdmin, (req, res) => {
    const id = intId(req.params.id);
    db.prepare('DELETE FROM services WHERE id = ?').run(id);
    res.json({ ok: true });
  });
  return r;
}

export function userRoutes(db) {
  const r = Router();
  r.use(requireAdmin);
  const list = () => db.prepare('SELECT id, name, email, role, active, last_login_at, created_at FROM users ORDER BY id').all();
  const activeAdmins = () => db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1").get().n;

  r.get('/', (req, res) => res.json(list()));
  r.post('/', (req, res) => {
    const name = str(req.body.name, 120);
    const email = str(req.body.email, 200);
    if (!name) throw bad('Nama diperlukan', 'Name is required');
    if (!isEmail(email)) throw bad('E-mel tidak sah', 'Invalid email');
    validatePassword(req.body.password);
    const role = req.body.role === 'admin' ? 'admin' : 'staff';
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw conflict('E-mel sudah digunakan', 'Email is already in use');
    db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name, email, bcrypt.hashSync(req.body.password, 10), role);
    res.status(201).json(list());
  });
  r.put('/:id', (req, res) => {
    const id = intId(req.params.id);
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!u) throw notFound('Pengguna', 'User');
    const name = str(req.body.name, 120) || u.name;
    const role = req.body.role === 'admin' ? 'admin' : req.body.role === 'staff' ? 'staff' : u.role;
    const active = req.body.active === undefined ? u.active : req.body.active ? 1 : 0;
    if (u.role === 'admin' && u.active && (role !== 'admin' || !active) && activeAdmins() <= 1) {
      throw bad('Mesti ada sekurang-kurangnya seorang pentadbir aktif', 'There must be at least one active administrator');
    }
    db.prepare('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?').run(name, role, active, id);
    if (req.body.password) {
      validatePassword(req.body.password);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(req.body.password, 10), id);
    }
    res.json(list());
  });
  r.delete('/:id', (req, res) => {
    const id = intId(req.params.id);
    if (id === req.user.id) throw bad('Anda tidak boleh memadam akaun sendiri', 'You cannot delete your own account');
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!u) throw notFound('Pengguna', 'User');
    if (u.role === 'admin' && activeAdmins() <= 1) throw bad('Mesti ada sekurang-kurangnya seorang pentadbir aktif', 'There must be at least one active administrator');
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json(list());
  });
  return r;
}

// ---------------------------------------------------------------------------
// Backup & restore
// ---------------------------------------------------------------------------
export const BACKUP_DIR = path.join(DATA_DIR, 'backups');

export function exportData(db) {
  const data = {};
  for (const t of TABLES) {
    data[t] = t === 'settings' ? db.prepare("SELECT * FROM settings WHERE key NOT LIKE '\\_\\_%' ESCAPE '\\'").all() : db.prepare(`SELECT * FROM ${t}`).all();
  }
  return { app: 'tastytuesday-bms', version: db.pragma('user_version', { simple: true }), exported_at: new Date().toISOString(), data };
}

export function importData(db, payload) {
  if (!payload || payload.app !== 'tastytuesday-bms' || typeof payload.data !== 'object') {
    throw bad('Fail sandaran tidak sah', 'Invalid backup file');
  }
  if (!Array.isArray(payload.data.users) || !payload.data.users.some((u) => u.role === 'admin' && u.active)) {
    throw bad('Sandaran mesti mengandungi sekurang-kurangnya seorang pentadbir aktif', 'Backup must contain at least one active administrator');
  }
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      for (const t of [...TABLES].reverse()) {
        if (t === 'settings') db.prepare("DELETE FROM settings WHERE key NOT LIKE '\\_\\_%' ESCAPE '\\'").run();
        else db.prepare(`DELETE FROM ${t}`).run();
      }
      for (const t of TABLES) {
        const rows = payload.data[t] || [];
        if (!Array.isArray(rows)) throw bad(`Data jadual ${t} tidak sah`, `Invalid data for table ${t}`);
        const cols = db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
        for (const row of rows) {
          if (t === 'settings' && String(row.key).startsWith('__')) continue;
          const keys = Object.keys(row).filter((k) => cols.includes(k));
          if (!keys.length) continue;
          db.prepare(`INSERT INTO ${t} (${keys.join(',')}) VALUES (${keys.map((k) => '@' + k).join(',')})`).run(Object.fromEntries(keys.map((k) => [k, row[k]])));
        }
      }
      const fk = db.pragma('foreign_key_check');
      if (fk.length) throw bad('Sandaran mengandungi hubungan data yang rosak', 'Backup contains broken data relationships');
    })();
  } finally {
    db.pragma('foreign_keys = ON');
  }
  sweepStatuses(db);
}

/** Snapshot the SQLite file into data/backups, keeping the newest `keep` files. */
export async function fileBackup(db, keep = 14) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const file = path.join(BACKUP_DIR, `bms-${stamp}.sqlite`);
  await db.backup(file);
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.sqlite')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) fs.unlinkSync(path.join(BACKUP_DIR, f));
  return file;
}

export function backupRoutes(db) {
  const r = Router();
  r.use(requireAdmin);

  r.get('/export', (req, res) => {
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="bms-backup-${stamp}.json"`);
    res.json(exportData(db));
  });

  r.post('/restore', async (req, res) => {
    if (db.name !== ':memory:') await fileBackup(db, 30); // safety copy first
    importData(db, req.body);
    logActivity(db, req.user, { entity_type: 'settings', action: 'restored', description: 'Data dipulihkan daripada sandaran' });
    res.json({ ok: true });
  });

  r.get('/files', (req, res) => {
    if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
    res.json(
      fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith('.sqlite'))
        .sort()
        .reverse()
        .map((f) => ({ name: f, size: fs.statSync(path.join(BACKUP_DIR, f)).size })),
    );
  });

  r.post('/files', async (req, res) => {
    if (db.name === ':memory:') throw new HttpError(400, 'Tidak disokong', 'Not supported');
    const file = await fileBackup(db);
    res.status(201).json({ name: path.basename(file) });
  });

  r.get('/files/:name', (req, res) => {
    const name = path.basename(String(req.params.name));
    const file = path.join(BACKUP_DIR, name);
    if (!/^bms-[\d-]+\.sqlite$/.test(name) || !fs.existsSync(file)) throw notFound('Fail', 'File');
    res.download(file);
  });

  return r;
}
