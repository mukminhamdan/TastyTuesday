import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { bad, notFound, conflict, str, intId, isTime, today, addDays } from '../lib/http.js';
import { BOOKING_STATUSES } from '../../shared/constants.js';
import { nextNumber } from '../lib/numbering.js';
import { logActivity } from '../lib/activity.js';
import { requireDate, sweepStatuses, syncBookingPayments } from '../lib/finance.js';
import { getSettings } from '../db.js';
import { createQuotation } from './quotations.js';
import { createInvoice } from './invoices.js';

export function parseBooking(row) {
  if (!row) return row;
  let services = [];
  try {
    services = JSON.parse(row.services || '[]');
  } catch {
    services = [];
  }
  return { ...row, services };
}

function bookingFields(db, body) {
  const customer_id = intId(body.customer_id);
  if (!customer_id || !db.prepare('SELECT 1 FROM customers WHERE id = ?').get(customer_id)) {
    throw bad('Sila pilih pelanggan', 'Please select a customer', { fields: ['customer_id'] });
  }
  const event_name = str(body.event_name, 200);
  if (!event_name) throw bad('Nama acara diperlukan', 'Event name is required', { fields: ['event_name'] });
  const event_date = requireDate(body.event_date, 'Tarikh acara', 'Event date');
  const start_time = str(body.start_time, 5);
  const end_time = str(body.end_time, 5);
  if (start_time && !isTime(start_time)) throw bad('Masa mula tidak sah', 'Invalid start time');
  if (end_time && !isTime(end_time)) throw bad('Masa tamat tidak sah', 'Invalid end time');
  if (start_time && end_time && end_time <= start_time) {
    throw bad('Masa tamat mestilah selepas masa mula', 'End time must be after start time', { fields: ['end_time'] });
  }
  const pax = body.pax === '' || body.pax == null ? null : Number(body.pax);
  if (pax !== null && (!Number.isInteger(pax) || pax < 0 || pax > 1000000)) throw bad('Bilangan peserta tidak sah', 'Invalid number of participants');
  const services = Array.isArray(body.services) ? body.services.map((s) => str(s, 200)).filter(Boolean).slice(0, 50) : [];
  return {
    customer_id,
    event_name,
    event_type: str(body.event_type, 100),
    event_date,
    start_time,
    end_time,
    venue: str(body.venue, 300),
    event_address: str(body.event_address, 1000),
    services: JSON.stringify(services),
    package: str(body.package, 200),
    pax,
    special_requirements: str(body.special_requirements, 5000),
    internal_notes: str(body.internal_notes, 5000),
  };
}

/** Bookings on the same date whose time ranges overlap. Missing times = whole day. */
export function findConflicts(db, { event_date, start_time, end_time, exclude_id }) {
  const rows = db
    .prepare(
      `SELECT b.id, b.booking_no, b.event_name, b.event_date, b.start_time, b.end_time, b.venue, b.status, c.name AS customer_name
       FROM bookings b JOIN customers c ON c.id = b.customer_id
       WHERE b.event_date = ? AND b.status != 'Cancelled' AND b.id != ?`,
    )
    .all(event_date, exclude_id || 0);
  const s1 = start_time || '00:00';
  const e1 = end_time || '23:59';
  return rows.filter((b) => {
    const s2 = b.start_time || '00:00';
    const e2 = b.end_time || '23:59';
    return s1 < e2 && s2 < e1;
  });
}

export function loadBooking(db, id) {
  const b = db
    .prepare(
      `SELECT b.*, c.name AS customer_name, c.company AS customer_company, c.phone AS customer_phone, c.email AS customer_email,
              c.customer_no
       FROM bookings b JOIN customers c ON c.id = b.customer_id WHERE b.id = ?`,
    )
    .get(id);
  return parseBooking(b);
}

export default function bookingRoutes(db) {
  const r = Router();

  r.get('/', (req, res) => {
    const where = [];
    const p = {};
    if (req.query.from) (where.push('b.event_date >= @from'), (p.from = String(req.query.from)));
    if (req.query.to) (where.push('b.event_date <= @to'), (p.to = String(req.query.to)));
    if (req.query.status) (where.push('b.status = @status'), (p.status = String(req.query.status)));
    if (req.query.customer_id) (where.push('b.customer_id = @cid'), (p.cid = intId(req.query.customer_id)));
    if (req.query.q) {
      where.push('(b.booking_no LIKE @q OR b.event_name LIKE @q OR c.name LIKE @q OR b.venue LIKE @q)');
      p.q = `%${req.query.q}%`;
    }
    const rows = db
      .prepare(
        `SELECT b.*, c.name AS customer_name, c.company AS customer_company, c.phone AS customer_phone,
           (SELECT COALESCE(SUM(total),0) FROM invoices i WHERE i.booking_id = b.id AND i.status != 'Cancelled') AS invoiced,
           (SELECT COALESCE(SUM(amount_paid),0) FROM invoices i WHERE i.booking_id = b.id AND i.status != 'Cancelled') AS paid,
           (SELECT COALESCE(SUM(total),0) FROM quotations q WHERE q.booking_id = b.id AND q.status = 'Approved') AS quoted
         FROM bookings b JOIN customers c ON c.id = b.customer_id
         ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY b.event_date DESC, b.start_time DESC`,
      )
      .all(p);
    res.json(rows.map(parseBooking));
  });

  r.get('/conflicts', (req, res) => {
    const event_date = String(req.query.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) return res.json([]);
    res.json(
      findConflicts(db, {
        event_date,
        start_time: str(req.query.start, 5),
        end_time: str(req.query.end, 5),
        exclude_id: intId(req.query.exclude),
      }),
    );
  });

  r.get('/:id', (req, res) => {
    sweepStatuses(db);
    const id = intId(req.params.id);
    const booking = loadBooking(db, id);
    if (!booking) throw notFound('Tempahan', 'Booking');
    const quotations = db.prepare('SELECT * FROM quotations WHERE booking_id = ? ORDER BY id DESC').all(id);
    const invoices = db.prepare('SELECT * FROM invoices WHERE booking_id = ? ORDER BY id DESC').all(id);
    const payments = db
      .prepare(
        `SELECT p.*, i.invoice_no FROM payments p JOIN invoices i ON i.id = p.invoice_id
         WHERE p.booking_id = ? ORDER BY p.payment_date, p.id`,
      )
      .all(id);
    const live = invoices.filter((i) => i.status !== 'Cancelled');
    const summary = {
      invoiced: live.reduce((s, i) => s + i.total, 0),
      paid: live.reduce((s, i) => s + i.amount_paid, 0),
      balance: live.reduce((s, i) => s + i.balance, 0),
      deposits: payments.filter((p) => p.status === 'Valid' && p.payment_type === 'Deposit').reduce((s, p) => s + p.amount, 0),
    };
    const conflicts = booking.status === 'Cancelled' ? [] : findConflicts(db, { ...booking, exclude_id: id });
    res.json({ ...booking, quotations, invoices, payments, summary, conflicts });
  });

  r.post('/', (req, res) => {
    const f = bookingFields(db, req.body);
    const status = BOOKING_STATUSES.includes(req.body.status) && req.body.status !== 'Cancelled' ? req.body.status : 'New Enquiry';
    const conflicts = findConflicts(db, f);
    if (conflicts.length && !req.body.allow_overlap) {
      throw conflict('Tempahan bertindih dengan tempahan lain pada tarikh dan masa yang sama', 'Booking overlaps with another booking at the same date and time', {
        code: 'OVERLAP',
        conflicts,
      });
    }
    const id = db.transaction(() => {
      const booking_no = nextNumber(db, 'booking', f.event_date);
      const info = db
        .prepare(
          `INSERT INTO bookings (booking_no, customer_id, event_name, event_type, event_date, start_time, end_time, venue, event_address,
             services, package, pax, special_requirements, internal_notes, status, created_by)
           VALUES (@booking_no, @customer_id, @event_name, @event_type, @event_date, @start_time, @end_time, @venue, @event_address,
             @services, @package, @pax, @special_requirements, @internal_notes, @status, @created_by)`,
        )
        .run({ ...f, booking_no, status, created_by: req.user.id });
      logActivity(db, req.user, {
        entity_type: 'booking',
        entity_id: info.lastInsertRowid,
        ref_no: booking_no,
        customer_id: f.customer_id,
        action: 'created',
        description: `Tempahan baharu: ${f.event_name}`,
      });
      return info.lastInsertRowid;
    })();
    res.status(201).json(loadBooking(db, id));
  });

  r.put('/:id', (req, res) => {
    const id = intId(req.params.id);
    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!existing) throw notFound('Tempahan', 'Booking');
    const f = bookingFields(db, req.body);
    if (f.customer_id !== existing.customer_id) {
      const linked = db.prepare('SELECT COUNT(*) AS n FROM invoices WHERE booking_id = ?').get(id).n;
      if (linked) throw bad('Pelanggan tidak boleh ditukar selepas invois dikeluarkan', 'Customer cannot be changed after an invoice has been issued');
    }
    const conflicts = existing.status === 'Cancelled' ? [] : findConflicts(db, { ...f, exclude_id: id });
    if (conflicts.length && !req.body.allow_overlap) {
      throw conflict('Tempahan bertindih dengan tempahan lain pada tarikh dan masa yang sama', 'Booking overlaps with another booking at the same date and time', {
        code: 'OVERLAP',
        conflicts,
      });
    }
    db.prepare(
      `UPDATE bookings SET customer_id=@customer_id, event_name=@event_name, event_type=@event_type, event_date=@event_date,
        start_time=@start_time, end_time=@end_time, venue=@venue, event_address=@event_address, services=@services, package=@package,
        pax=@pax, special_requirements=@special_requirements, internal_notes=@internal_notes, updated_at=datetime('now')
       WHERE id=@id`,
    ).run({ ...f, id });
    logActivity(db, req.user, { entity_type: 'booking', entity_id: id, ref_no: existing.booking_no, customer_id: f.customer_id, action: 'updated', description: `Tempahan dikemas kini: ${f.event_name}` });
    res.json(loadBooking(db, id));
  });

  // Manual status change (e.g. confirm, complete, cancel, reopen).
  r.post('/:id/status', (req, res) => {
    const id = intId(req.params.id);
    const b = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!b) throw notFound('Tempahan', 'Booking');
    const status = req.body.status;
    if (!BOOKING_STATUSES.includes(status)) throw bad('Status tidak sah', 'Invalid status');
    if (status === 'Cancelled') {
      const paid = db.prepare("SELECT COUNT(*) AS n FROM payments WHERE booking_id = ? AND status = 'Valid'").get(id).n;
      const reason = str(req.body.reason, 1000);
      db.prepare("UPDATE bookings SET status='Cancelled', cancel_reason=?, cancelled_at=datetime('now'), updated_at=datetime('now') WHERE id=?").run(reason, id);
      logActivity(db, req.user, { entity_type: 'booking', entity_id: id, ref_no: b.booking_no, customer_id: b.customer_id, action: 'cancelled', description: `Tempahan dibatalkan${reason ? ': ' + reason : ''}${paid ? ' (bayaran telah diterima - semak bayaran balik)' : ''}` });
    } else {
      db.prepare(
        `UPDATE bookings SET status=?, cancel_reason=NULL, cancelled_at=NULL,
         completed_at = CASE WHEN ?='Completed' THEN datetime('now') ELSE NULL END, updated_at=datetime('now') WHERE id=?`,
      ).run(status, status, id);
      // Re-derive payment state when reopening a booking.
      if (status !== 'Completed') syncBookingPayments(db, id);
      logActivity(db, req.user, { entity_type: 'booking', entity_id: id, ref_no: b.booking_no, customer_id: b.customer_id, action: 'status', description: `Status tempahan: ${status}` });
    }
    res.json(loadBooking(db, id));
  });

  // Convert enquiry -> draft quotation (copies customer, event and services).
  r.post('/:id/quotation', (req, res) => {
    const id = intId(req.params.id);
    const b = loadBooking(db, id);
    if (!b) throw notFound('Tempahan', 'Booking');
    if (b.status === 'Cancelled') throw bad('Tempahan telah dibatalkan', 'Booking is cancelled');
    const s = getSettings(db);
    const items = itemsFromBooking(db, b);
    const q = db.transaction(() =>
      createQuotation(db, req.user, {
        customer_id: b.customer_id,
        booking_id: b.id,
        quotation_date: today(),
        valid_until: addDays(today(), s.quotation_validity_days || 14),
        event_name: b.event_name,
        event_date: b.event_date,
        event_venue: [b.venue, b.event_address].filter(Boolean).join(', '),
        items,
        discount_type: 'fixed',
        discount_value: 0,
        tax_enabled: !!s.tax_enabled_default,
        tax_rate: s.tax_rate_default,
        tax_label: s.tax_label,
        terms: s.quotation_terms,
        payment_terms: s.payment_terms,
      }),
    )();
    res.status(201).json(q);
  });

  // Generate invoice directly from booking (uses approved quotation when present).
  r.post('/:id/invoice', (req, res) => {
    const id = intId(req.params.id);
    const b = loadBooking(db, id);
    if (!b) throw notFound('Tempahan', 'Booking');
    if (b.status === 'Cancelled') throw bad('Tempahan telah dibatalkan', 'Booking is cancelled');
    const s = getSettings(db);
    const approved = db
      .prepare("SELECT * FROM quotations WHERE booking_id = ? AND status = 'Approved' ORDER BY approved_at DESC, id DESC LIMIT 1")
      .get(id);
    let source;
    if (approved) {
      const qItems = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order').all(approved.id);
      source = { ...approved, items: qItems, quotation_id: approved.id };
    } else {
      source = {
        items: itemsFromBooking(db, b),
        discount_type: 'fixed',
        discount_value: 0,
        tax_enabled: s.tax_enabled_default ? 1 : 0,
        tax_rate: s.tax_rate_default,
        tax_label: s.tax_label,
      };
    }
    const inv = db.transaction(() =>
      createInvoice(db, req.user, {
        ...invoiceDefaults(s, b),
        quotation_id: source.quotation_id || null,
        items: source.items,
        discount_type: source.discount_type,
        discount_value: source.discount_value,
        additional_label: source.additional_label,
        additional_charges: source.additional_charges,
        tax_enabled: !!source.tax_enabled,
        tax_rate: source.tax_rate,
        tax_label: source.tax_label,
        notes: source.notes,
      }),
    )();
    res.status(201).json(inv);
  });

  r.delete('/:id', requireAdmin, (req, res) => {
    const id = intId(req.params.id);
    const b = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!b) throw notFound('Tempahan', 'Booking');
    const inv = db.prepare('SELECT COUNT(*) AS n FROM invoices WHERE booking_id = ?').get(id).n;
    if (inv) {
      throw conflict(
        'Tempahan ini mempunyai invois. Batalkan tempahan sebagai ganti untuk mengekalkan rekod kewangan.',
        'This booking has invoices. Cancel the booking instead to keep the financial records.',
      );
    }
    db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
    logActivity(db, req.user, { entity_type: 'booking', entity_id: id, ref_no: b.booking_no, customer_id: b.customer_id, action: 'deleted', description: `Tempahan dipadam: ${b.event_name}` });
    res.json({ ok: true });
  });

  return r;
}

export function invoiceDefaults(s, b) {
  const date = today();
  return {
    customer_id: b.customer_id,
    booking_id: b.id,
    invoice_date: date,
    due_date: dueDate(date, b.event_date, s.payment_terms_days),
    event_name: b.event_name,
    event_date: b.event_date,
    event_venue: [b.venue, b.event_address].filter(Boolean).join(', '),
    deposit_percent: s.deposit_percent,
    terms: s.invoice_terms,
    payment_instructions: s.payment_instructions,
  };
}

/** Due date = invoice date + payment terms, but never after the event itself. */
export function dueDate(invoiceDate, eventDate, termsDays) {
  const d = addDays(invoiceDate, termsDays || 14);
  if (eventDate && eventDate >= invoiceDate && eventDate < d) return eventDate;
  return d;
}

/** Build line items from a booking's package + services using the catalogue prices. */
export function itemsFromBooking(db, b) {
  const lookup = db.prepare('SELECT * FROM services WHERE name = ? COLLATE NOCASE AND active = 1 LIMIT 1');
  const names = [b.package, ...(b.services || [])].filter(Boolean);
  const seen = new Set();
  const items = [];
  for (const name of names) {
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const svc = lookup.get(name);
    items.push({
      service_id: svc?.id ?? null,
      description: svc?.name ?? name,
      details: svc?.description ?? null,
      quantity: 1,
      unit: svc?.unit ?? null,
      unit_price: svc?.unit_price ?? 0,
    });
  }
  if (!items.length) {
    items.push({ description: b.event_name, details: b.event_type, quantity: 1, unit_price: 0 });
  }
  return items;
}
