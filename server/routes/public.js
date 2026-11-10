// Unauthenticated, token-based read-only access for documents shared with customers.
import { Router } from 'express';
import { getSettings } from '../db.js';
import { notFound } from '../lib/http.js';
import { loadQuotation, setQuotationStatus } from './quotations.js';
import { loadInvoice } from './invoices.js';
import { loadPayment } from './payments.js';
import { sweepStatuses } from '../lib/finance.js';

const PUBLIC_SETTINGS = [
  'business_name', 'registration_no', 'address', 'phone', 'email', 'website', 'social_media', 'logo',
  'bank_name', 'bank_account_no', 'bank_account_name', 'doc_template', 'accent_color', 'doc_footer', 'tax_label', 'default_language', 'signatory_name', 'signatory_title',
];

function strip(doc) {
  // Never expose internal data on shared links.
  const { internal_notes, created_by, share_token, ...rest } = doc;
  return rest;
}

export default function publicRoutes(db) {
  const r = Router();
  r.get('/:kind/:token', (req, res) => {
    sweepStatuses(db);
    const { kind, token } = req.params;
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) throw notFound('Dokumen', 'Document');
    const table = { quotation: 'quotations', invoice: 'invoices', receipt: 'payments' }[kind];
    if (!table) throw notFound('Dokumen', 'Document');
    const row = db.prepare(`SELECT id, ${kind === 'quotation' ? 'status' : "'' AS status"} FROM ${table} WHERE share_token = ?`).get(token);
    if (!row) throw notFound('Dokumen', 'Document');
    if (kind === 'quotation' && row.status === 'Sent') {
      db.transaction(() => setQuotationStatus(db, { id: null, name: 'Pelanggan (pautan)' }, row.id, 'Viewed'))();
    }
    const doc = kind === 'quotation' ? loadQuotation(db, row.id) : kind === 'invoice' ? loadInvoice(db, row.id) : loadPayment(db, row.id);
    if (doc.payments) doc.payments = doc.payments.map(strip);
    const all = getSettings(db);
    const settings = Object.fromEntries(PUBLIC_SETTINGS.map((k) => [k, all[k]]));
    res.json({ kind, doc: strip(doc), settings });
  });
  return r;
}
