// Workflow automation: totals, invoice balances, booking status propagation.
import { calcTotals } from '../../shared/calc.js';
import { bookingRank } from '../../shared/constants.js';
import { bad, str, sen, isDate, today } from './http.js';

/** Validate + normalise line items from a request body. */
export function normaliseItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw bad('Sila tambah sekurang-kurangnya satu item', 'Please add at least one line item');
  }
  if (rawItems.length > 200) throw bad('Terlalu banyak item', 'Too many line items');
  return rawItems.map((it, i) => {
    const description = str(it.description, 500);
    if (!description) throw bad(`Item ${i + 1}: keterangan diperlukan`, `Item ${i + 1}: description is required`);
    const quantity = Number(it.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1e6) {
      throw bad(`Item ${i + 1}: kuantiti tidak sah`, `Item ${i + 1}: invalid quantity`);
    }
    return {
      service_id: Number.isInteger(Number(it.service_id)) && Number(it.service_id) > 0 ? Number(it.service_id) : null,
      description,
      details: str(it.details, 2000),
      quantity: Math.round(quantity * 100) / 100,
      unit: str(it.unit, 40),
      unit_price: sen(it.unit_price, `Item ${i + 1}: harga seunit`, `Item ${i + 1}: unit price`),
    };
  });
}

/** Common pricing fields for quotations and invoices. */
export function pricingFields(body) {
  const discount_type = body.discount_type === 'percent' ? 'percent' : 'fixed';
  let discount_value = Number(body.discount_value || 0);
  if (!Number.isFinite(discount_value) || discount_value < 0) throw bad('Diskaun tidak sah', 'Invalid discount');
  if (discount_type === 'percent' && discount_value > 100) throw bad('Diskaun tidak boleh melebihi 100%', 'Discount cannot exceed 100%');
  if (discount_type === 'fixed') discount_value = Math.round(discount_value);
  const tax_rate = Number(body.tax_rate || 0);
  if (!Number.isFinite(tax_rate) || tax_rate < 0 || tax_rate > 100) throw bad('Kadar cukai tidak sah', 'Invalid tax rate');
  return {
    discount_type,
    discount_value,
    additional_label: str(body.additional_label, 120),
    additional_charges: sen(body.additional_charges, 'Caj tambahan', 'Additional charges'),
    tax_enabled: body.tax_enabled ? 1 : 0,
    tax_label: str(body.tax_label, 40),
    tax_rate,
  };
}

export function totalsFor(items, pricing) {
  return calcTotals({ items, ...pricing, tax_enabled: !!pricing.tax_enabled });
}

export function replaceItems(db, table, fkCol, docId, items) {
  db.prepare(`DELETE FROM ${table} WHERE ${fkCol} = ?`).run(docId);
  const ins = db.prepare(
    `INSERT INTO ${table} (${fkCol}, service_id, description, details, quantity, unit, unit_price, amount, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  items.forEach((it, i) =>
    ins.run(docId, it.service_id ?? null, it.description, it.details ?? null, it.quantity, it.unit ?? null, it.unit_price, it.amount, i),
  );
}

export function requireDate(v, ms, en) {
  if (!isDate(v)) throw bad(`${ms} tidak sah (DD/MM/YYYY)`, `${en} is invalid (DD/MM/YYYY)`);
  return v;
}

/**
 * Move a booking forward to `status` if it is currently at an earlier stage.
 * Never moves backwards and never touches Completed / Cancelled bookings.
 */
export function advanceBooking(db, bookingId, status) {
  if (!bookingId) return;
  const b = db.prepare('SELECT id, status FROM bookings WHERE id = ?').get(bookingId);
  if (!b || b.status === 'Cancelled' || b.status === 'Completed') return;
  if (bookingRank(status) > bookingRank(b.status)) {
    db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, bookingId);
  }
}

/** Derive Deposit Paid / Fully Paid from the booking's invoices. */
export function syncBookingPayments(db, bookingId) {
  if (!bookingId) return;
  const b = db.prepare('SELECT id, status FROM bookings WHERE id = ?').get(bookingId);
  if (!b || b.status === 'Cancelled' || b.status === 'Completed') return;
  const agg = db
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS total, COALESCE(SUM(amount_paid),0) AS paid
       FROM invoices WHERE booking_id = ? AND status NOT IN ('Cancelled')`,
    )
    .get(bookingId);
  let next = b.status;
  if (agg.n > 0 && agg.total > 0 && agg.paid >= agg.total) next = 'Fully Paid';
  else if (agg.paid > 0) next = 'Deposit Paid';
  else if (b.status === 'Deposit Paid' || b.status === 'Fully Paid') next = 'Confirmed';
  if (next !== b.status) {
    db.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?").run(next, bookingId);
  }
}

/** Recalculate paid amount, balance and status for an invoice. */
export function recomputeInvoice(db, invoiceId) {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!inv) return null;
  const paid = db.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE invoice_id = ? AND status = 'Valid'").get(invoiceId).s;
  const balance = inv.total - paid;
  let status = inv.status;
  let paid_at = inv.paid_at;
  if (inv.status !== 'Cancelled') {
    const overdue = inv.due_date < today() && balance > 0;
    if (inv.total > 0 && balance <= 0) {
      status = 'Paid';
      paid_at = paid_at || new Date().toISOString().slice(0, 19).replace('T', ' ');
    } else if (paid > 0) {
      status = overdue ? 'Overdue' : 'Partially Paid';
      paid_at = null;
    } else if (inv.status === 'Draft') {
      status = 'Draft';
      paid_at = null;
    } else {
      status = overdue ? 'Overdue' : 'Sent';
      paid_at = null;
    }
  }
  db.prepare("UPDATE invoices SET amount_paid = ?, balance = ?, status = ?, paid_at = ?, updated_at = datetime('now') WHERE id = ?").run(
    paid,
    balance,
    status,
    paid_at,
    invoiceId,
  );
  syncBookingPayments(db, inv.booking_id);
  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
}

/** Time-based status changes: overdue invoices and expired quotations. */
export function sweepStatuses(db) {
  const t = today();
  db.prepare(
    `UPDATE invoices SET status = 'Overdue'
     WHERE status IN ('Sent','Partially Paid') AND balance > 0 AND due_date < ?`,
  ).run(t);
  db.prepare(
    `UPDATE invoices SET status = CASE WHEN balance <= 0 AND total > 0 THEN 'Paid' WHEN amount_paid > 0 THEN 'Partially Paid' ELSE 'Sent' END
     WHERE status = 'Overdue' AND (due_date >= ? OR balance <= 0)`,
  ).run(t);
  db.prepare(`UPDATE quotations SET status = 'Expired' WHERE status IN ('Sent','Viewed') AND valid_until < ?`).run(t);
}

/**
 * Recalculate balance_after and payment_type of every valid payment on an invoice,
 * in date order. Used when a payment's date is edited so receipts stay consistent.
 */
export function resequencePayments(db, invoiceId) {
  const inv = db.prepare('SELECT total FROM invoices WHERE id = ?').get(invoiceId);
  if (!inv) return;
  const list = db.prepare("SELECT id, amount FROM payments WHERE invoice_id = ? AND status = 'Valid' ORDER BY payment_date, id").all(invoiceId);
  const upd = db.prepare('UPDATE payments SET balance_after = ?, payment_type = ? WHERE id = ?');
  let paid = 0;
  list.forEach((p, i) => {
    paid += p.amount;
    const balance = inv.total - paid;
    upd.run(balance, inferPaymentType(i, balance), p.id);
  });
}

/** Payment type label from position in the invoice's payment sequence. */
export function inferPaymentType(priorValidCount, balanceAfter) {
  if (balanceAfter <= 0) return priorValidCount === 0 ? 'Full' : 'Balance';
  return priorValidCount === 0 ? 'Deposit' : 'Partial';
}
