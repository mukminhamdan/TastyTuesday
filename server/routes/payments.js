import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../lib/auth.js';
import { bad, notFound, str, intId, today } from '../lib/http.js';
import { PAYMENT_METHODS } from '../../shared/constants.js';
import { logActivity, rm } from '../lib/activity.js';
import { recomputeInvoice, requireDate, sweepStatuses, resequencePayments } from '../lib/finance.js';

export function loadPayment(db, id) {
  const p = db
    .prepare(
      `SELECT p.*, i.invoice_no, i.total AS invoice_total, i.amount_paid AS invoice_paid, i.balance AS invoice_balance, i.status AS invoice_status,
              i.event_name, i.event_date, b.booking_no, c.customer_no, c.name AS customer_name, c.company AS customer_company,
              c.phone AS customer_phone, c.email AS customer_email, c.billing_address AS customer_address
       FROM payments p JOIN invoices i ON i.id = p.invoice_id JOIN customers c ON c.id = p.customer_id
       LEFT JOIN bookings b ON b.id = p.booking_id WHERE p.id = ?`,
    )
    .get(id);
  if (!p) return null;
  p.paid_to_date = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE invoice_id = ? AND status = 'Valid' AND (payment_date < ? OR (payment_date = ? AND id <= ?))")
    .get(p.invoice_id, p.payment_date, p.payment_date, p.id).s;
  return p;
}

export function paymentSummary(db, { from, to } = {}) {
  sweepStatuses(db);
  const range = (col) => `${from ? ` AND ${col} >= @from` : ''}${to ? ` AND ${col} <= @to` : ''}`;
  const p = { from, to, today: today() };
  const inv = db
    .prepare(
      `SELECT COALESCE(SUM(total),0) AS invoiced, COUNT(*) AS invoice_count
       FROM invoices WHERE status NOT IN ('Cancelled','Draft') ${range('invoice_date')}`,
    )
    .get(p);
  const collected = db
    .prepare(`SELECT COALESCE(SUM(amount),0) AS s, COUNT(*) AS n FROM payments WHERE status = 'Valid' ${range('payment_date')}`)
    .get(p);
  const deposits = db
    .prepare(`SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE status = 'Valid' AND payment_type = 'Deposit' ${range('payment_date')}`)
    .get(p).s;
  // Outstanding / overdue are point-in-time figures (all open invoices).
  const outstanding = db
    .prepare("SELECT COALESCE(SUM(balance),0) AS s, COUNT(*) AS n FROM invoices WHERE status IN ('Sent','Partially Paid','Overdue') AND balance > 0")
    .get();
  const overdue = db.prepare("SELECT COALESCE(SUM(balance),0) AS s, COUNT(*) AS n FROM invoices WHERE status = 'Overdue'").get();
  const by_method = db
    .prepare(`SELECT method, COUNT(*) AS count, SUM(amount) AS amount FROM payments WHERE status = 'Valid' ${range('payment_date')} GROUP BY method`)
    .all(p);
  return {
    total_invoiced: inv.invoiced,
    invoice_count: inv.invoice_count,
    total_collected: collected.s,
    payment_count: collected.n,
    total_outstanding: outstanding.s,
    outstanding_count: outstanding.n,
    total_overdue: overdue.s,
    overdue_count: overdue.n,
    deposits_received: deposits,
    pending_payments: outstanding.n,
    by_method,
  };
}

export default function paymentRoutes(db) {
  const r = Router();

  r.get('/', (req, res) => {
    const where = [];
    const p = {};
    if (req.query.from) (where.push('p.payment_date >= @from'), (p.from = String(req.query.from)));
    if (req.query.to) (where.push('p.payment_date <= @to'), (p.to = String(req.query.to)));
    if (req.query.method) (where.push('p.method = @method'), (p.method = String(req.query.method)));
    if (req.query.customer_id) (where.push('p.customer_id = @cid'), (p.cid = intId(req.query.customer_id)));
    if (req.query.invoice_id) (where.push('p.invoice_id = @iid'), (p.iid = intId(req.query.invoice_id)));
    if (req.query.status) (where.push('p.status = @status'), (p.status = String(req.query.status)));
    const rows = db
      .prepare(
        `SELECT p.*, i.invoice_no, i.status AS invoice_status, b.booking_no, c.name AS customer_name, c.company AS customer_company
         FROM payments p JOIN invoices i ON i.id = p.invoice_id JOIN customers c ON c.id = p.customer_id
         LEFT JOIN bookings b ON b.id = p.booking_id
         ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY p.payment_date DESC, p.id DESC`,
      )
      .all(p);
    res.json(rows);
  });

  r.get('/summary', (req, res) => {
    res.json(paymentSummary(db, { from: str(req.query.from, 10), to: str(req.query.to, 10) }));
  });

  r.get('/:id', (req, res) => {
    const p = loadPayment(db, intId(req.params.id));
    if (!p) throw notFound('Resit', 'Receipt');
    res.json(p);
  });

  // Edit non-financial details (amount changes require void + re-record).
  r.put('/:id', (req, res) => {
    const id = intId(req.params.id);
    const pay = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
    if (!pay) throw notFound('Resit', 'Receipt');
    if (pay.status === 'Void') throw bad('Resit yang dibatalkan tidak boleh diubah', 'Voided receipts cannot be edited');
    const method = PAYMENT_METHODS.includes(req.body.method) ? req.body.method : pay.method;
    const payment_date = req.body.payment_date ? requireDate(req.body.payment_date, 'Tarikh bayaran', 'Payment date') : pay.payment_date;
    db.transaction(() => {
      db.prepare('UPDATE payments SET method = ?, payment_date = ?, reference = ?, description = ?, received_by = ? WHERE id = ?').run(
        method,
        payment_date,
        str(req.body.reference, 200),
        str(req.body.description, 1000),
        str(req.body.received_by, 120),
        id,
      );
      if (payment_date !== pay.payment_date) resequencePayments(db, pay.invoice_id);
    })();
    logActivity(db, req.user, { entity_type: 'payment', entity_id: id, ref_no: pay.receipt_no, customer_id: pay.customer_id, action: 'updated', description: 'Butiran resit dikemas kini' });
    res.json(loadPayment(db, id));
  });

  // Void a payment: receipt is kept (marked VOID) and invoice balance is restored.
  r.post('/:id/void', requireAdmin, (req, res) => {
    const id = intId(req.params.id);
    const pay = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
    if (!pay) throw notFound('Resit', 'Receipt');
    if (pay.status === 'Void') throw bad('Bayaran ini telah dibatalkan', 'This payment is already void');
    const reason = str(req.body.reason, 1000);
    if (!reason) throw bad('Sila nyatakan sebab pembatalan', 'Please give a reason for voiding');
    db.transaction(() => {
      db.prepare("UPDATE payments SET status = 'Void', void_reason = ?, voided_at = datetime('now') WHERE id = ?").run(reason, id);
      recomputeInvoice(db, pay.invoice_id);
      logActivity(db, req.user, {
        entity_type: 'payment',
        entity_id: id,
        ref_no: pay.receipt_no,
        customer_id: pay.customer_id,
        action: 'voided',
        description: `Bayaran ${rm(pay.amount)} dibatalkan: ${reason}`,
      });
    })();
    res.json(loadPayment(db, id));
  });

  r.post('/:id/share', (req, res) => {
    const id = intId(req.params.id);
    const p = db.prepare('SELECT id, share_token FROM payments WHERE id = ?').get(id);
    if (!p) throw notFound('Resit', 'Receipt');
    const token = p.share_token || crypto.randomBytes(18).toString('base64url');
    if (!p.share_token) db.prepare('UPDATE payments SET share_token = ? WHERE id = ?').run(token, id);
    res.json({ token });
  });

  return r;
}
