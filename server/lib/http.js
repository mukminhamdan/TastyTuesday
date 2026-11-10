// HTTP helpers: bilingual errors and small validators.

export class HttpError extends Error {
  constructor(status, ms, en, extra = {}) {
    super(en || ms);
    this.status = status;
    this.ms = ms;
    this.en = en || ms;
    this.extra = extra;
  }
}

export const bad = (ms, en, extra) => new HttpError(400, ms, en, extra);
export const notFound = (what = 'Rekod', whatEn = 'Record') =>
  new HttpError(404, `${what} tidak dijumpai`, `${whatEn} not found`);
export const conflict = (ms, en, extra) => new HttpError(409, ms, en, extra);
export const forbidden = () => new HttpError(403, 'Anda tidak mempunyai kebenaran untuk tindakan ini', 'You do not have permission for this action');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isDate(v) {
  if (typeof v !== 'string' || !DATE_RE.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
export const isTime = (v) => typeof v === 'string' && TIME_RE.test(v);
export const isEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v);

/** Trimmed string or null. Enforces a max length. */
export function str(v, max = 2000) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

export function requireFields(body, fields) {
  const missing = fields.filter(([key]) => body[key] === undefined || body[key] === null || String(body[key]).trim() === '');
  if (missing.length) {
    throw bad(
      `Sila lengkapkan: ${missing.map((m) => m[1]).join(', ')}`,
      `Please complete: ${missing.map((m) => m[2] || m[1]).join(', ')}`,
      { fields: missing.map((m) => m[0]) },
    );
  }
}

export function intId(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Integer sen from request body value. */
export function sen(v, label = 'Amaun', labelEn = 'Amount') {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1e12) throw bad(`${label} tidak sah`, `${labelEn} is invalid`);
  return Math.round(n);
}

export const APP_TZ = process.env.APP_TZ || 'Asia/Kuala_Lumpur';

/** Today's date (YYYY-MM-DD) in the business timezone. */
export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

export function errorHandler(err, req, res, _next) {
  const lang = req.get('X-Lang') === 'en' ? 'en' : 'ms';
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: lang === 'en' ? err.en : err.ms, ...err.extra });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: lang === 'en' ? 'Upload is too large' : 'Fail terlalu besar' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: lang === 'en' ? 'Invalid request data' : 'Data permintaan tidak sah' });
  }
  if (err?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(409).json({
      error: lang === 'en' ? 'This record is linked to other records and cannot be removed' : 'Rekod ini dipautkan kepada rekod lain dan tidak boleh dipadam',
    });
  }
  if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: lang === 'en' ? 'A record with the same value already exists' : 'Rekod dengan nilai yang sama sudah wujud' });
  }
  console.error(err);
  res.status(500).json({ error: lang === 'en' ? 'An unexpected server error occurred' : 'Ralat pelayan tidak dijangka berlaku' });
}
