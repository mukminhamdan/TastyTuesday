import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../lib/auth.js';
import { bad, notFound, conflict, str, intId, today, sen } from '../lib/http.js';
import { PAYMENT_METHODS, PAYMENT_TYPES } from '../../shared/constants.js';
import { nextNumber } from '../lib/numbering.js';
import { logActivity, bm, rm } from '../lib/activity.js';
import {
  normaliseItems,
  pricingFields,
  totalsFor,
  replaceItems,
  requireDate,
  recomputeInvoice,
  sweepStatuses,
  advanceBooking,
  inferPaymentType,
  syncBookingPayments,
} from '../lib/finance.js';
import { getSettings } from '../db.js';
import { dueDate } from './bookings.js';

const fmt = rm;

function invoiceFields(db, body) {
  const customer_id = intId(body.customer_id);
  if (!customer_id || !db.prepare('SELECT 1 FROM customers WHERE id = ?').get(customer_id)) {
    throw bad('Sila pilih pelanggan', 'Please select a customer', { fields: ['customer_id'] });
  }
  const booking_id = intId(body.booking_id);
  if (booking_id) {
    const b = db.prepare('SELECT customer_id FROM bookings WHERE id = ?').get(booking_id);
    if (!b) throw bad('Tempahan tidak dijumpai', 'Booking not found');
    if (b.customer_id !== customer_id) throw bad('Tempahan bukan milik pelanggan ini', 'Booking does not belong to this customer');
  }
  const quotation_id = intId(body.quotation_id);
  if (quotation_id && !db.prepare('SELECT 1 FROM quotations WHERE id = ? AND customer_id = ?').get(quotation_id, customer_id)) {
    throw bad('Sebut harga tidak sepadan dengan pelanggan', 'Quotation does not match the customer');
  }
  const invoice_date = requireDate(body.invoice_date, 'Tarikh invois', 'Invoice date');
  const due_date = requireDate(body.due_date, 'Tarikh akhir bayaran', 'Due date');
  if (due_date < invoice_date) throw bad('Tarikh akhir mestilah pada atau selepas tarikh invois', 'Due date must be on or after the invoice date');
  const event_date = body.event_date ? requireDate(body.event_date, 'Tarikh acara', 'Event date') : null;
  const deposit_percent = Number(body.deposit_percent || 0);
  if (!Number.isFinite(deposit_percent) || deposit_percent < 0 || deposit_percent > 100) throw bad('Peratus deposit tidak sah', 'Invalid deposit percentage');
  return {
    customer_id,
    booking_id,
    quotation_id,
    invoice_date,
    due_date,
    event_name: str(body.event_name, 200),
    event_date,
    event_venue: str(body.event_venue, 1000),
    deposit_percent,
    notes: str(body.notes, 5000),
    terms: str(body.terms, 10000),
    payment_instructions: str(body.payment_instructions, 5000),
    ...pricingFields(body),
  };
}

/** Create an invoice (API, booking and quotation conversion). Call inside a transaction. */
export function createInvoice(db, user, body) {
  const f = invoiceFields(db, body);
  const items = normaliseItems(body.items);
  const t = totalsFor(items, f);
  const invoice_no = nextNumber(db, 'invoice', f.invoice_date);
  const deposit_required = Math.round((t.total * f.deposit_percent) / 100);
  const info = db
    .prepare(
      `INSERT INTO invoices (invoice_no, customer_id, booking_id, quotation_id, invoice_date, due_date, event_name, event_date, event_venue,
        discount_type, discount_value, additional_label, additional_charges, tax_enabled, tax_label, tax_rate,
        subtotal, discount_amount, tax_amount, total, deposit_percent, deposit_required, amount_paid, balance,
        notes, terms, payment_instructions, status, created_by)
       VALUES (@invoice_no, @customer_id, @booking_id, @quotation_id, @invoice_date, @due_date, @event_name, @event_date, @event_venue,
        @discount_type, @discount_value, @additional_label, @additional_charges, @tax_enabled, @tax_label, @tax_rate,
        @subtotal, @discount_amount, @tax_amount, @total, @deposit_percent, @deposit_required, 0, @total,
        @notes, @terms, @payment_instructions, 'Draft', @created_by)`,
    )
    .run({ ...f, invoice_no, subtotal: t.subtotal, discount_amount: t.discount_amount, tax_amount: t.tax_amount, total: t.total, deposit_required, created_by: user?.id ?? null });
  const id = info.lastInsertRowid;
  replaceItems(db, 'invoice_items', 'invoice_id', id, t.items);
  // An invoice means the job is going ahead.
  advanceBooking(db, f.booking_id, 'Confirmed');
  logActivity(db, user, { entity_type: 'invoice', entity_id: id, ref_no: invoice_no, customer_id: f.customer_id, action: 'created', description: `Invois dikeluarkan (${fmt(t.total)})` });
  if (body.status === 'Sent') markSent(db, user, id);
  return loadInvoice(db, id);
}

function markSent(db, user, id) {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  db.prepare("UPDATE invoices SET status = 'Sent', sent_at = COALESCE(sent_at, datetime('now')) WHERE id = ?").run(id);
  recomputeInvoice(db, id);
  logActivity(db, user, { entity_type: 'invoice', entity_id: id, ref_no: inv.invoice_no, customer_id: inv.customer_id, action: 'status', description: 'Invois dihantar kepada pelanggan' });
}

export function loadInvoice(db, id) {
  const inv = db
    .prepare(
      `SELECT i.*, c.customer_no, c.name AS customer_name, c.company AS customer_company, c.contact_person AS customer_contact,
              c.phone AS customer_phone, c.email AS customer_email, c.billing_address AS customer_address,
              b.booking_no, b.status AS booking_status, b.start_time, b.end_time, q.quotation_no
       FROM invoices i JOIN customers c ON c.id = i.customer_id
       LEFT JOIN bookings b ON b.id = i.booking_id LEFT JOIN quotations q ON q.id = i.quotation_id
       WHERE i.id = ?`,
    )
    .get(id);
  if (!inv) return null;
  inv.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order, id').all(id);
  inv.payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date, id').all(id);
  inv.deposit_paid = inv.payments.filter((p) => p.status === 'Valid' && p.payment_type === 'Deposit').reduce((s, p) => s + p.amount, 0);
  return inv;
}

/** Record a payment against an invoice, generate its receipt and update all balances. */
export function recordPayment(db, user, invoiceId, body) {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!inv) throw notFound('Invois', 'Invoice');
  if (inv.status === 'Cancelled') throw bad('Invois telah dibatalkan', 'Invoice is cancelled');
  if (inv.balance <= 0) throw bad('Invois ini telah dibayar sepenuhnya', 'This invoice is already fully paid');
  const amount = sen(body.amount);
  if (amount <= 0) throw bad('Amaun bayaran mestilah lebih daripada RM 0.00', 'Payment amount must be more than RM 0.00', { fields: ['amount'] });
  if (amount > inv.balance) {
    throw bad(`Amaun melebihi baki tertunggak (${fmt(inv.balance)})`, `Amount exceeds the outstanding balance (${fmt(inv.balance)})`, { fields: ['amount'] });
  }
  const payment_date = requireDate(body.payment_date || today(), 'Tarikh bayaran', 'Payment date');
  const method = PAYMENT_METHODS.includes(body.method) ? body.method : null;
  if (!method) throw bad('Sila pilih kaedah bayaran', 'Please select a payment method', { fields: ['method'] });
  const balance_after = inv.balance - amount;
  const prior = db.prepare("SELECT COUNT(*) AS n FROM payments WHERE invoice_id = ? AND status = 'Valid'").get(invoiceId).n;
  const payment_type = PAYMENT_TYPES.includes(body.payment_type) ? body.payment_type : inferPaymentType(prior, balance_after);
  const receipt_no = nextNumber(db, 'receipt', payment_date);
  const info = db
    .prepare(
      `INSERT INTO payments (receipt_no, invoice_id, customer_id, booking_id, payment_date, amount, method, reference, description,
         payment_type, balance_after, received_by, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      receipt_no,
      invoiceId,
      inv.customer_id,
      inv.booking_id,
      payment_date,
      amount,
      method,
      str(body.reference, 200),
      str(body.description, 1000) || defaultDescription(payment_type, inv.invoice_no),
      payment_type,
      balance_after,
      str(body.received_by, 120) || user?.name || null,
      user?.id ?? null,
    );
  // Recording a payment on a draft implies it has been issued.
  if (inv.status === 'Draft') db.prepare("UPDATE invoices SET status = 'Sent', sent_at = COALESCE(sent_at, datetime('now')) WHERE id = ?").run(invoiceId);
  recomputeInvoice(db, invoiceId);
  logActivity(db, user, {
    entity_type: 'payment',
    entity_id: info.lastInsertRowid,
    ref_no: receipt_no,
    customer_id: inv.customer_id,
    action: 'created',
    description: `Bayaran ${fmt(amount)} (${bm(method)}) bagi ${inv.invoice_no}. Baki: ${fmt(balance_after)}`,
  });
  return info.lastInsertRowid;
}

function defaultDescription(type, invoiceNo) {
  const label = { Deposit: 'Bayaran deposit', Partial: 'Bayaran separa', Balance: 'Bayaran baki akhir', Full: 'Bayaran penuh' }[type];
  return `${label} bagi invois ${invoiceNo}`;
}

export default function invoiceRoutes(db) {
  const r = Router();

  r.get('/', (req, res) => {
    sweepStatuses(db);
    const where = [];
    const p = {};
    if (req.query.status) (where.push('i.status = @status'), (p.status = String(req.query.status)));
    if (req.query.customer_id) (where.push('i.customer_id = @cid'), (p.cid = intId(req.query.customer_id)));
    if (req.query.from) (where.push('i.invoice_date >= @from'), (p.from = String(req.query.from)));
    if (req.query.to) (where.push('i.invoice_date <= @to'), (p.to = String(req.query.to)));
    if (req.query.outstanding) where.push("i.balance > 0 AND i.status NOT IN ('Cancelled','Draft')");
    const rows = db
      .prepare(
        `SELECT i.*, c.name AS customer_name, c.company AS customer_company, b.booking_no, q.quotation_no
         FROM invoices i JOIN customers c ON c.id = i.customer_id
         LEFT JOIN bookings b ON b.id = i.booking_id LEFT JOIN quotations q ON q.id = i.quotation_id
         ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY i.invoice_date DESC, i.id DESC`,
      )
      .all(p);
    res.json(rows);
  });

  r.get('/:id', (req, res) => {
    sweepStatuses(db);
    const inv = loadInvoice(db, intId(req.params.id));
    if (!inv) throw notFound('Invois', 'Invoice');
    res.json(inv);
  });

  r.post('/', (req, res) => {
    const inv = db.transaction(() => createInvoice(db, req.user, req.body))();
    res.status(201).json(inv);
  });

  r.put('/:id', (req, res) => {
    const id = intId(req.params.id);
    const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!existing) throw notFound('Invois', 'Invoice');
    if (existing.status === 'Cancelled') throw bad('Invois yang dibatalkan tidak boleh diubah', 'Cancelled invoices cannot be edited');
    if (existing.status === 'Paid') throw bad('Invois yang telah dibayar tidak boleh diubah', 'Paid invoices cannot be edited');
    const f = invoiceFields(db, req.body);
    const items = normaliseItems(req.body.items);
    const t = totalsFor(items, f);
    if (t.total < existing.amount_paid) {
      throw bad(`Jumlah baharu tidak boleh kurang daripada amaun yang telah dibayar (${fmt(existing.amount_paid)})`, `New total cannot be less than the amount already paid (${fmt(existing.amount_paid)})`);
    }
    if (f.booking_id !== existing.booking_id || f.customer_id !== existing.customer_id) {
      const n = db.prepare('SELECT COUNT(*) AS n FROM payments WHERE invoice_id = ?').get(id).n;
      if (n) throw bad('Pelanggan / tempahan tidak boleh ditukar selepas bayaran direkodkan', 'Customer / booking cannot be changed after payments are recorded');
    }
    db.transaction(() => {
      db.prepare(
        `UPDATE invoices SET customer_id=@customer_id, booking_id=@booking_id, quotation_id=@quotation_id, invoice_date=@invoice_date,
          due_date=@due_date, event_name=@event_name, event_date=@event_date, event_venue=@event_venue, discount_type=@discount_type,
          discount_value=@discount_value, additional_label=@additional_label, additional_charges=@additional_charges,
          tax_enabled=@tax_enabled, tax_label=@tax_label, tax_rate=@tax_rate, subtotal=@subtotal, discount_amount=@discount_amount,
          tax_amount=@tax_amount, total=@total, deposit_percent=@deposit_percent, deposit_required=@deposit_required, notes=@notes,
          terms=@terms, payment_instructions=@payment_instructions, updated_at=datetime('now')
         WHERE id=@id`,
      ).run({ ...f, id, subtotal: t.subtotal, discount_amount: t.discount_amount, tax_amount: t.tax_amount, total: t.total, deposit_required: Math.round((t.total * f.deposit_percent) / 100) });
      replaceItems(db, 'invoice_items', 'invoice_id', id, t.items);
      if (req.body.status === 'Sent' && existing.status === 'Draft') markSent(db, req.user, id);
      recomputeInvoice(db, id);
      if (existing.booking_id && existing.booking_id !== f.booking_id) syncBookingPayments(db, existing.booking_id);
      logActivity(db, req.user, { entity_type: 'invoice', entity_id: id, ref_no: existing.invoice_no, customer_id: f.customer_id, action: 'updated', description: `Invois dikemas kini (${fmt(t.total)})` });
    })();
    res.json(loadInvoice(db, id));
  });

  r.post('/:id/status', (req, res) => {
    const id = intId(req.params.id);
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!inv) throw notFound('Invois', 'Invoice');
    const status = req.body.status;
    db.transaction(() => {
      if (status === 'Sent') {
        if (inv.status === 'Cancelled') throw bad('Invois telah dibatalkan', 'Invoice is cancelled');
        markSent(db, req.user, id);
      } else if (status === 'Draft') {
        if (inv.amount_paid > 0 || inv.status === 'Cancelled') throw bad('Invois ini tidak boleh dikembalikan kepada draf', 'This invoice cannot be returned to draft');
        db.prepare("UPDATE invoices SET status = 'Draft' WHERE id = ?").run(id);
      } else if (status === 'Cancelled') {
        const paid = db.prepare("SELECT COUNT(*) AS n FROM payments WHERE invoice_id = ? AND status = 'Valid'").get(id).n;
        if (paid) throw bad('Batalkan (void) semua bayaran dahulu sebelum membatalkan invois', 'Void all payments before cancelling this invoice');
        const reason = str(req.body.reason, 1000);
        db.prepare("UPDATE invoices SET status = 'Cancelled', cancelled_at = datetime('now'), cancel_reason = ? WHERE id = ?").run(reason, id);
        syncBookingPayments(db, inv.booking_id);
        logActivity(db, req.user, { entity_type: 'invoice', entity_id: id, ref_no: inv.invoice_no, customer_id: inv.customer_id, action: 'cancelled', description: `Invois dibatalkan${reason ? ': ' + reason : ''}` });
      } else {
        throw bad('Status tidak sah. Status bayaran dikemas kini secara automatik.', 'Invalid status. Payment statuses update automatically.');
      }
    })();
    res.json(loadInvoice(db, id));
  });

  r.post('/:id/payments', (req, res) => {
    const id = intId(req.params.id);
    const paymentId = db.transaction(() => recordPayment(db, req.user, id, req.body))();
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
    res.status(201).json({ payment, invoice: loadInvoice(db, id) });
  });

  r.post('/:id/duplicate', (req, res) => {
    const src = loadInvoice(db, intId(req.params.id));
    if (!src) throw notFound('Invois', 'Invoice');
    const s = getSettings(db);
    const date = today();
    const inv = db.transaction(() =>
      createInvoice(db, req.user, {
        ...src,
        tax_enabled: !!src.tax_enabled,
        quotation_id: null,
        invoice_date: date,
        due_date: dueDate(date, src.event_date, s.payment_terms_days),
        items: src.items,
        status: 'Draft',
      }),
    )();
    res.status(201).json(inv);
  });

  r.post('/:id/share', (req, res) => {
    const id = intId(req.params.id);
    const inv = db.prepare('SELECT id, share_token FROM invoices WHERE id = ?').get(id);
    if (!inv) throw notFound('Invois', 'Invoice');
    const token = inv.share_token || crypto.randomBytes(18).toString('base64url');
    if (!inv.share_token) db.prepare('UPDATE invoices SET share_token = ? WHERE id = ?').run(token, id);
    res.json({ token });
  });

  r.delete('/:id', requireAdmin, (req, res) => {
    const id = intId(req.params.id);
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!inv) throw notFound('Invois', 'Invoice');
    const n = db.prepare('SELECT COUNT(*) AS n FROM payments WHERE invoice_id = ?').get(id).n;
    if (n) throw conflict('Invois ini mempunyai rekod bayaran/resit. Batalkan invois sebagai ganti.', 'This invoice has payment/receipt records. Cancel the invoice instead.');
    db.transaction(() => {
      db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
      syncBookingPayments(db, inv.booking_id);
      logActivity(db, req.user, { entity_type: 'invoice', entity_id: id, ref_no: inv.invoice_no, customer_id: inv.customer_id, action: 'deleted', description: 'Invois dipadam' });
    })();
    res.json({ ok: true });
  });

  return r;
}
