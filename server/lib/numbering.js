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
  const s = String(p ?? '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  return s || fallback;
}

/**
 * Allocate the next sequential document number, e.g. INV-2026-0001.
 * Customers use PREFIX-0001 (no year). Must run inside a transaction.
 * The counter is only ever incremented, so numbers are never reused even
 * when documents are deleted or cancelled.
 */
export function nextNumber(db, type, dateStr) {
  const [table, col] = TABLE_FOR[type];
  const prefix = cleanPrefix(getSetting(db, `prefix_${type}`), DEFAULT_PREFIXES[type]);
  const year = type === 'customer' ? 0 : Number(String(dateStr || '').slice(0, 4)) || new Date().getFullYear();
  const bump = db.prepare(
    `INSERT INTO counters (doc_type, year, last_number) VALUES (?, ?, 1)
     ON CONFLICT(doc_type, year) DO UPDATE SET last_number = last_number + 1
     RETURNING last_number`,
  );
  const exists = db.prepare(`SELECT 1 FROM ${table} WHERE ${col} = ?`);
  for (let guard = 0; guard < 10000; guard++) {
    const n = bump.get(type, year).last_number;
    const no = year ? `${prefix}-${year}-${String(n).padStart(4, '0')}` : `${prefix}-${String(n).padStart(4, '0')}`;
    if (!exists.get(no)) return no;
  }
  throw new Error('Unable to allocate document number');
}
