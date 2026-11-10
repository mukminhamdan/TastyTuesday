import { getSetting } from '../db.js';
import { DEFAULT_PREFIXES } from '../../shared/constants.js';

const TABLE_FOR = {
  customer: ['customers', 'customer_no'],
  booking: ['bookings', 'booking_no'],
  quotation: ['quotations', 'quotation_no'],
  invoice: ['invoices', 'invoice_no'],
  receipt: ['payments', 'receipt_no'],
};

function cleanPrefix(p, fallback) {
  if (p === undefined || p === null) return fallback;
  // An empty prefix is allowed (numbers such as "0211" or "2026-0211").
  return String(p).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/^-+|-+$/g, '');
}

/** Counter key (year) used for a document type. 0 = one continuous sequence. */
export function counterYear(db, type, dateStr) {
  if (type === 'customer' || getSetting(db, 'number_include_year') === false) return 0;
  return Number(String(dateStr || '').slice(0, 4)) || new Date().getFullYear();
}

export function formatNumber(prefix, year, n) {
  return [prefix, year || null, String(n).padStart(4, '0')].filter(Boolean).join('-');
}

/**
 * Allocate the next sequential document number, e.g. INV-2026-0001 (or INV-0001 / 0001
 * depending on settings). Must run inside a transaction. The counter is only ever
 * incremented, so numbers are never reused even when documents are deleted or cancelled.
 */
export function nextNumber(db, type, dateStr) {
  const [table, col] = TABLE_FOR[type];
  const prefix = cleanPrefix(getSetting(db, `prefix_${type}`), DEFAULT_PREFIXES[type]);
  const year = counterYear(db, type, dateStr);
  const bump = db.prepare(
    `INSERT INTO counters (doc_type, year, last_number) VALUES (?, ?, 1)
     ON CONFLICT(doc_type, year) DO UPDATE SET last_number = last_number + 1
     RETURNING last_number`,
  );
  const exists = db.prepare(`SELECT 1 FROM ${table} WHERE ${col} = ?`);
  for (let guard = 0; guard < 10000; guard++) {
    const no = formatNumber(prefix, year, bump.get(type, year).last_number);
    if (!exists.get(no)) return no;
  }
  throw new Error('Unable to allocate document number');
}

/** Next number that will be issued for each document type (for the settings screen). */
export function peekNumbers(db, dateStr) {
  const out = {};
  for (const type of Object.keys(TABLE_FOR)) {
    const year = counterYear(db, type, dateStr);
    const last = db.prepare('SELECT last_number FROM counters WHERE doc_type = ? AND year = ?').get(type, year)?.last_number || 0;
    out[type] = { year, next: last + 1, preview: formatNumber(cleanPrefix(getSetting(db, `prefix_${type}`), DEFAULT_PREFIXES[type]), year, last + 1) };
  }
  return out;
}

/** Move a sequence forward so the next document gets `next` (e.g. to continue from paper invoices). */
export function setNextNumber(db, type, dateStr, next) {
  const year = counterYear(db, type, dateStr);
  const last = db.prepare('SELECT last_number FROM counters WHERE doc_type = ? AND year = ?').get(type, year)?.last_number || 0;
  if (!Number.isInteger(next) || next < 1 || next > 9999999) return { ok: false, last };
  if (next - 1 < last) return { ok: false, last };
  db.prepare(
    `INSERT INTO counters (doc_type, year, last_number) VALUES (?, ?, ?)
     ON CONFLICT(doc_type, year) DO UPDATE SET last_number = excluded.last_number`,
  ).run(type, year, next - 1);
  return { ok: true, last: next - 1 };
}
