import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../lib/auth.js';
import { bad, notFound, conflict, str, intId, today } from '../lib/http.js';
import { QUOTATION_STATUSES } from '../../shared/constants.js';
import { nextNumber } from '../lib/numbering.js';
import { logActivity } from '../lib/activity.js';
import { normaliseItems, pricingFields, totalsFor, replaceItems, requireDate, advanceBooking, sweepStatuses } from '../lib/finance.js';
import { getSettings } from '../db.js';
import { createInvoice } from './invoices.js';
import { invoiceDefaults, findConflicts, loadBooking } from './bookings.js';

function quotationFields(db, body) {
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
  const quotation_date = requireDate(body.quotation_date, 'Tarikh sebut harga', 'Quotation date');
  const valid_until = requireDate(body.valid_until, 'Sah sehingga', 'Valid until');
  if (valid_until < quotation_date) throw bad('Tarikh sah mestilah selepas tarikh sebut harga', 'Valid-until date must be after the quotation date');
  const event_date = body.event_date ? requireDate(body.event_date, 'Tarikh acara', 'Event date') : null;
  return {
    customer_id,
    booking_id,
    quotation_date,
    valid_until,
    event_name: str(body.event_name, 200),
    event_date,
    event_venue: str(body.event_venue, 1000),
    notes: str(body.notes, 5000),
    terms: str(body.terms, 10000),
    payment_terms: str(body.payment_terms, 5000),
    ...pricingFields(body),
  };
}

/** Create a quotation (used by the API and by booking conversion). Call inside a transaction. */
export function createQuotation(db, user, body) {
  const f = quotationFields(db, body);
  const items = normaliseItems(body.items);
  const t = totalsFor(items, f);
  const quotation_no = nextNumber(db, 'quotation', f.quotation_date);
  const info = db
    .prepare(
      `INSERT INTO quotations (quotation_no, customer_id, booking_id, quotation_date, valid_until, event_name, event_date, event_venue,
        discount_type, discount_value, additional_label, additional_charges, tax_enabled, tax_label, tax_rate,
        subtotal, discount_amount, tax_amount, total, notes, terms, payment_terms, status, created_by)
       VALUES (@quotation_no, @customer_id, @booking_id, @quotation_date, @valid_until, @event_name, @event_date, @event_venue,
        @discount_type, @discount_value, @additional_label, @additional_charges, @tax_enabled, @tax_label, @tax_rate,
        @subtotal, @discount_amount, @tax_amount, @total, @notes, @terms, @payment_terms, 'Draft', @created_by)`,
    )
    .run({ ...f, quotation_no, subtotal: t.subtotal, discount_amount: t.discount_amount, tax_amount: t.tax_amount, total: t.total, created_by: user?.id ?? null });
  const id = info.lastInsertRowid;
  replaceItems(db, 'quotation_items', 'quotation_id', id, t.items);
  advanceBooking(db, f.booking_id, 'Pending Quotation');
  logActivity(db, user, { entity_type: 'quotation', entity_id: id, ref_no: quotation_no, customer_id: f.customer_id, action: 'created', description: `Sebut harga dicipta (RM ${(t.total / 100).toFixed(2)})` });
  if (body.status === 'Sent') setQuotationStatus(db, user, id, 'Sent');
  return loadQuotation(db, id);
}

export function loadQuotation(db, id) {
  const q = db
    .prepare(
      `SELECT q.*, c.customer_no, c.name AS customer_name, c.company AS customer_company, c.contact_person AS customer_contact,
              c.phone AS customer_phone, c.email AS customer_email, c.billing_address AS customer_address,
              b.booking_no, b.status AS booking_status, b.start_time, b.end_time, b.event_type, b.pax
       FROM quotations q JOIN customers c ON c.id = q.customer_id LEFT JOIN bookings b ON b.id = q.booking_id
       WHERE q.id = ?`,
    )
    .get(id);
  if (!q) return null;
  q.items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order, id').all(id);
  q.invoices = db.prepare('SELECT id, invoice_no, status, total, balance FROM invoices WHERE quotation_id = ? ORDER BY id').all(id);
  return q;
}

export function setQuotationStatus(db, user, id, status) {
  const q = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id);
  const stamp = { Sent: 'sent_at', Viewed: 'viewed_at', Approved: 'approved_at', Rejected: 'rejected_at' }[status];
  db.prepare(`UPDATE quotations SET status = ?, ${stamp ? `${stamp} = COALESCE(${stamp}, datetime('now')),` : ''} updated_at = datetime('now') WHERE id = ?`).run(status, id);
  if (status === 'Sent') advanceBooking(db, q.booking_id, 'Quotation Sent');
  if (status === 'Viewed') advanceBooking(db, q.booking_id, 'Awaiting Confirmation');
  if (status === 'Approved') advanceBooking(db, q.booking_id, 'Confirmed');
  logActivity(db, user, { entity_type: 'quotation', entity_id: id, ref_no: q.quotation_no, customer_id: q.customer_id, action: 'status', description: `Status sebut harga: ${status}` });
}

export default function quotationRoutes(db) {
  const r = Router();

  r.get('/', (req, res) => {
    sweepStatuses(db);
    const where = [];
    const p = {};
    if (req.query.status) (where.push('q.status = @status'), (p.status = String(req.query.status)));
    if (req.query.customer_id) (where.push('q.customer_id = @cid'), (p.cid = intId(req.query.customer_id)));
    if (req.query.from) (where.push('q.quotation_date >= @from'), (p.from = String(req.query.from)));
    if (req.query.to) (where.push('q.quotation_date <= @to'), (p.to = String(req.query.to)));
    const rows = db
      .prepare(
        `SELECT q.*, c.name AS customer_name, c.company AS customer_company, b.booking_no,
           (SELECT COUNT(*) FROM invoices i WHERE i.quotation_id = q.id) AS invoice_count
         FROM quotations q JOIN customers c ON c.id = q.customer_id LEFT JOIN bookings b ON b.id = q.booking_id
         ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY q.quotation_date DESC, q.id DESC`,
      )
      .all(p);
    res.json(rows);
  });

  r.get('/:id', (req, res) => {
    sweepStatuses(db);
    const q = loadQuotation(db, intId(req.params.id));
    if (!q) throw notFound('Sebut harga', 'Quotation');
    res.json(q);
  });

  r.post('/', (req, res) => {
    const q = db.transaction(() => createQuotation(db, req.user, req.body))();
    res.status(201).json(q);
  });

  r.put('/:id', (req, res) => {
    const id = intId(req.params.id);
    const existing = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id);
    if (!existing) throw notFound('Sebut harga', 'Quotation');
    if (existing.status === 'Approved') {
      throw bad('Sebut harga yang telah diluluskan tidak boleh diubah. Sila buat salinan.', 'Approved quotations cannot be edited. Please duplicate it instead.');
    }
    const f = quotationFields(db, req.body);
    const items = normaliseItems(req.body.items);
    const t = totalsFor(items, f);
    db.transaction(() => {
      // Editing an expired quotation with a new valid-until date makes it a draft again.
      const status = existing.status === 'Expired' && f.valid_until >= today() ? 'Draft' : existing.status;
      db.prepare(
        `UPDATE quotations SET customer_id=@customer_id, booking_id=@booking_id, quotation_date=@quotation_date, valid_until=@valid_until,
          event_name=@event_name, event_date=@event_date, event_venue=@event_venue, discount_type=@discount_type, discount_value=@discount_value,
          additional_label=@additional_label, additional_charges=@additional_charges, tax_enabled=@tax_enabled, tax_label=@tax_label,
          tax_rate=@tax_rate, subtotal=@subtotal, discount_amount=@discount_amount, tax_amount=@tax_amount, total=@total, notes=@notes,
          terms=@terms, payment_terms=@payment_terms, status=@status, updated_at=datetime('now')
         WHERE id=@id`,
      ).run({ ...f, id, status, subtotal: t.subtotal, discount_amount: t.discount_amount, tax_amount: t.tax_amount, total: t.total });
      replaceItems(db, 'quotation_items', 'quotation_id', id, t.items);
      if (req.body.status === 'Sent' && ['Draft', 'Expired', 'Rejected'].includes(status)) setQuotationStatus(db, req.user, id, 'Sent');
      logActivity(db, req.user, { entity_type: 'quotation', entity_id: id, ref_no: existing.quotation_no, customer_id: f.customer_id, action: 'updated', description: 'Sebut harga dikemas kini' });
    })();
    res.json(loadQuotation(db, id));
  });

  r.post('/:id/status', (req, res) => {
    const id = intId(req.params.id);
    const q = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id);
    if (!q) throw notFound('Sebut harga', 'Quotation');
    const status = req.body.status;
    if (!QUOTATION_STATUSES.includes(status) || status === 'Expired') throw bad('Status tidak sah', 'Invalid status');
    if (q.status === 'Approved' && status !== 'Approved') {
      const n = db.prepare('SELECT COUNT(*) AS n FROM invoices WHERE quotation_id = ?').get(id).n;
      if (n) throw bad('Sebut harga ini telah ditukar kepada invois', 'This quotation has already been converted into an invoice');
    }
    if (status === 'Approved' && q.valid_until < today() && !req.body.force) {
      throw conflict('Sebut harga ini telah tamat tempoh. Kemas kini tarikh sah dahulu.', 'This quotation has expired. Update the valid-until date first.');
    }
    db.transaction(() => setQuotationStatus(db, req.user, id, status))();
    res.json(loadQuotation(db, id));
  });

  r.post('/:id/duplicate', (req, res) => {
    const src = loadQuotation(db, intId(req.params.id));
    if (!src) throw notFound('Sebut harga', 'Quotation');
    const s = getSettings(db);
    const date = today();
    const valid = new Date(date + 'T00:00:00Z');
    valid.setUTCDate(valid.getUTCDate() + Number(s.quotation_validity_days || 14));
    const q = db.transaction(() =>
      createQuotation(db, req.user, {
        ...src,
        tax_enabled: !!src.tax_enabled,
        quotation_date: date,
        valid_until: valid.toISOString().slice(0, 10),
        items: src.items,
        status: 'Draft',
      }),
    )();
    res.status(201).json(q);
  });

  // Approved quotation -> invoice. No re-entry: items, pricing and event are copied.
  r.post('/:id/convert-invoice', (req, res) => {
    const id = intId(req.params.id);
    const q = loadQuotation(db, id);
    if (!q) throw notFound('Sebut harga', 'Quotation');
    if (q.status !== 'Approved') throw bad('Hanya sebut harga yang diluluskan boleh ditukar kepada invois', 'Only approved quotations can be converted into invoices');
    const existing = db.prepare("SELECT id FROM invoices WHERE quotation_id = ? AND status != 'Cancelled'").get(id);
    if (existing && !req.body.force) {
      throw conflict('Invois untuk sebut harga ini sudah wujud', 'An invoice for this quotation already exists', { code: 'EXISTS', invoice_id: existing.id });
    }
    const s = getSettings(db);
    const base = invoiceDefaults(s, { customer_id: q.customer_id, id: q.booking_id, event_name: q.event_name, event_date: q.event_date });
    const inv = db.transaction(() =>
      createInvoice(db, req.user, {
        ...base,
        event_venue: q.event_venue,
        quotation_id: q.id,
        items: q.items,
        discount_type: q.discount_type,
        discount_value: q.discount_value,
        additional_label: q.additional_label,
        additional_charges: q.additional_charges,
        tax_enabled: !!q.tax_enabled,
        tax_rate: q.tax_rate,
        tax_label: q.tax_label,
        notes: q.notes,
      }),
    )();
    res.status(201).json(inv);
  });

  // Approved quotation without a booking -> confirmed booking.
  r.post('/:id/convert-booking', (req, res) => {
    const id = intId(req.params.id);
    const q = loadQuotation(db, id);
    if (!q) throw notFound('Sebut harga', 'Quotation');
    if (q.status !== 'Approved') throw bad('Hanya sebut harga yang diluluskan boleh disahkan sebagai tempahan', 'Only approved quotations can be converted into bookings');
    if (q.booking_id) {
      advanceBooking(db, q.booking_id, 'Confirmed');
      return res.json(loadBooking(db, q.booking_id));
    }
    const event_date = req.body.event_date || q.event_date;
    if (!event_date) throw bad('Tarikh acara diperlukan untuk tempahan', 'An event date is required for the booking');
    requireDate(event_date, 'Tarikh acara', 'Event date');
    const start_time = str(req.body.start_time, 5);
    const end_time = str(req.body.end_time, 5);
    const conflicts = findConflicts(db, { event_date, start_time, end_time });
    if (conflicts.length && !req.body.allow_overlap) {
      throw conflict('Tempahan bertindih dengan tempahan lain', 'Booking overlaps with another booking', { code: 'OVERLAP', conflicts });
    }
    const bookingId = db.transaction(() => {
      const booking_no = nextNumber(db, 'booking', event_date);
      const info = db
        .prepare(
          `INSERT INTO bookings (booking_no, customer_id, event_name, event_date, start_time, end_time, venue, services, status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?)`,
        )
        .run(booking_no, q.customer_id, q.event_name || 'Acara', event_date, start_time, end_time, q.event_venue, JSON.stringify(q.items.map((i) => i.description)), req.user.id);
      const bid = info.lastInsertRowid;
      db.prepare('UPDATE quotations SET booking_id = ?, event_date = COALESCE(event_date, ?) WHERE id = ?').run(bid, event_date, id);
      db.prepare('UPDATE invoices SET booking_id = ? WHERE quotation_id = ? AND booking_id IS NULL').run(bid, id);
      logActivity(db, req.user, { entity_type: 'booking', entity_id: bid, ref_no: booking_no, customer_id: q.customer_id, action: 'created', description: `Tempahan disahkan daripada ${q.quotation_no}` });
      return bid;
    })();
    res.status(201).json(loadBooking(db, bookingId));
  });

  r.post('/:id/share', (req, res) => {
    const id = intId(req.params.id);
    const q = db.prepare('SELECT id, share_token FROM quotations WHERE id = ?').get(id);
    if (!q) throw notFound('Sebut harga', 'Quotation');
    const token = q.share_token || crypto.randomBytes(18).toString('base64url');
    if (!q.share_token) db.prepare('UPDATE quotations SET share_token = ? WHERE id = ?').run(token, id);
    res.json({ token });
  });

  r.delete('/:id', requireAdmin, (req, res) => {
    const id = intId(req.params.id);
    const q = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id);
    if (!q) throw notFound('Sebut harga', 'Quotation');
    const n = db.prepare('SELECT COUNT(*) AS n FROM invoices WHERE quotation_id = ?').get(id).n;
    if (n) throw conflict('Sebut harga ini telah ditukar kepada invois dan tidak boleh dipadam', 'This quotation has been converted into an invoice and cannot be deleted');
    db.prepare('DELETE FROM quotations WHERE id = ?').run(id);
    logActivity(db, req.user, { entity_type: 'quotation', entity_id: id, ref_no: q.quotation_no, customer_id: q.customer_id, action: 'deleted', description: 'Sebut harga dipadam' });
    res.json({ ok: true });
  });

  return r;
}
