// Malaysian formatting helpers: RM currency, DD/MM/YYYY dates.

const nf = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtAmount = (sen) => nf.format((Number(sen) || 0) / 100);
export const fmtRM = (sen) => {
  const n = Number(sen) || 0;
  return (n < 0 ? '-RM ' : 'RM ') + nf.format(Math.abs(n) / 100);
};

export function fmtDate(iso) {
  if (!iso) return '-';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  if (!y || !m || !d) return '-';
  return `${d}/${m}/${y}`;
}

/** "DD/MM/YYYY" (or D/M/YYYY) -> "YYYY-MM-DD", null when invalid. */
export function parseDMY(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(iso + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}

/** UTC 'YYYY-MM-DD HH:MM:SS' -> local 'DD/MM/YYYY HH:MM'. */
export function fmtDateTime(utc) {
  if (!utc) return '-';
  const d = new Date(String(utc).replace(' ', 'T') + (String(utc).includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return '-';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fmtTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const fmtTimeRange = (a, b) => (a ? fmtTime(a) + (b ? ` - ${fmtTime(b)}` : '') : '');

export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + Number(n || 0));
  return d.toISOString().slice(0, 10);
}

export function isoFromParts(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function lastDayOfMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export const MONTHS = {
  ms: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
export const MONTHS_SHORT = {
  ms: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
export const WEEKDAYS_SHORT = {
  ms: ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Ahd'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

/** 'YYYY-MM' -> 'Nov 2026' */
export function fmtPeriod(k, lang = 'ms') {
  if (!k) return '';
  if (k.length === 4) return k;
  const [y, m] = k.split('-').map(Number);
  return `${MONTHS_SHORT[lang][m - 1]} ${y}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const telLink = (phone) => (phone ? `tel:${phone.replace(/[^0-9+]/g, '')}` : undefined);

/** WhatsApp link with Malaysian number normalisation (01x -> 601x). */
export function whatsappLink(phone, text) {
  let n = String(phone || '').replace(/[^0-9]/g, '');
  if (n.startsWith('0')) n = '6' + n;
  return `https://wa.me/${n}?text=${encodeURIComponent(text || '')}`;
}
