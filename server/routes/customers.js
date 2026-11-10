import { Router } from 'express';
import { requireAdmin } from '../lib/auth.js';
import { bad, notFound, conflict, str, isEmail, intId } from '../lib/http.js';
import { nextNumber } from '../lib/numbering.js';
import { logActivity } from '../lib/activity.js';
import { sweepStatuses } from '../lib/finance.js';

function customerFields(body) {
  const name = str(body.name, 200);
  if (!name) throw bad('Nama pelanggan diperlukan', 'Customer name is required', { fields: ['name'] });
  const email = str(body.email, 200);
  if (email && !isEmail(email)) throw bad('Alamat e-mel tidak sah', 'Invalid email address', { fields: ['email'] });
  const phone = str(body.phone, 40);
  if (phone && !/^[0-9+()\-\s]{6,20}$/.test(phone)) {
    throw bad('Nombor telefon tidak sah', 'Invalid phone number', { fields: ['phone'] });
  }
  return {
    name,
    company: str(body.company, 200),
    contact_person: str(body.contact_person, 200),
    phone,
    email,
    billing_address: str(body.billing_address, 1000),
    event_location: str(body.event_location, 1000),
    category: str(body.category, 100),
    notes: str(body.notes, 5000),
  };
}

export default function customerRoutes(db) {
  const r = Router();

  r.get('/', (req, res) => {
    sweepStatuses(db);
    const q = str(req.query.q, 100);
    const rows = db
      .prepare(
        `SELECT c.*,
          (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id) AS booking_count,
          (SELECT COUNT(*) FROM quotations q WHERE q.customer_id = c.id) AS quotation_count,
          (SELECT COALESCE(SUM(total),0) FROM invoices i WHERE i.customer_id = c.id AND i.status != 'Cancelled') AS total_invoiced,
          (SELECT COALESCE(SUM(amount_paid),0) FROM invoices i WHERE i.customer_id = c.id AND i.status != 'Cancelled') AS total_paid,
          (SELECT COALESCE(SUM(balance),0) FROM invoices i WHERE i.customer_id = c.id AND i.status NOT IN ('Cancelled','Draft')) AS outstanding,
          (SELECT MAX(event_date) FROM bookings b WHERE b.customer_id = c.id) AS last_event_date
        FROM customers c
        ${q ? `WHERE c.name LIKE @q OR c.company LIKE @q OR c.phone LIKE @q OR c.email LIKE @q OR c.customer_no LIKE @q OR c.contact_person LIKE @q` : ''}
        ORDER BY c.created_at DESC, c.id DESC`,
      )
      .all(q ? { q: `%${q}%` } : {});
    res.json(rows);
  });

  r.get('/:id', (req, res) => {
    sweepStatuses(db);
    const id = intId(req.params.id);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) throw notFound('Pelanggan', 'Customer');
    const bookings = db.prepare('SELECT * FROM bookings WHERE customer_id = ? ORDER BY event_date DESC').all(id);
    const quotations = db.prepare('SELECT * FROM quotations WHERE customer_id = ? ORDER BY quotation_date DESC, id DESC').all(id);
    const invoices = db.prepare('SELECT * FROM invoices WHERE customer_id = ? ORDER BY invoice_date DESC, id DESC').all(id);
    const payments = db
      .prepare(
        `SELECT p.*, i.invoice_no FROM payments p JOIN invoices i ON i.id = p.invoice_id
         WHERE p.customer_id = ? ORDER BY p.payment_date DESC, p.id DESC`,
      )
      .all(id);
    const activity = db.prepare('SELECT * FROM activity_log WHERE customer_id = ? ORDER BY id DESC LIMIT 50').all(id);
    const live = invoices.filter((i) => i.status !== 'Cancelled');
    const summary = {
      total_invoiced: live.reduce((s, i) => s + i.total, 0),
      total_paid: live.reduce((s, i) => s + i.amount_paid, 0),
      outstanding: live.filter((i) => i.status !== 'Draft').reduce((s, i) => s + i.balance, 0),
    };
    res.json({ ...customer, bookings, quotations, invoices, payments, activity, summary });
  });

  r.post('/', (req, res) => {
    const f = customerFields(req.body);
    const created = db.transaction(() => {
      const customer_no = nextNumber(db, 'customer');
      const info = db
        .prepare(
          `INSERT INTO customers (customer_no, name, company, contact_person, phone, email, billing_address, event_location, category, notes)
           VALUES (@customer_no, @name, @company, @contact_person, @phone, @email, @billing_address, @event_location, @category, @notes)`,
        )
        .run({ ...f, customer_no });
      logActivity(db, req.user, {
        entity_type: 'customer',
        entity_id: info.lastInsertRowid,
        ref_no: customer_no,
        customer_id: info.lastInsertRowid,
        action: 'created',
        description: `Pelanggan baharu: ${f.name}`,
      });
      return db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
    })();
    res.status(201).json(created);
  });

  r.put('/:id', (req, res) => {
    const id = intId(req.params.id);
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!existing) throw notFound('Pelanggan', 'Customer');
    const f = customerFields(req.body);
    db.prepare(
      `UPDATE customers SET name=@name, company=@company, contact_person=@contact_person, phone=@phone, email=@email,
       billing_address=@billing_address, event_location=@event_location, category=@category, notes=@notes, updated_at=datetime('now')
       WHERE id=@id`,
    ).run({ ...f, id });
    logActivity(db, req.user, { entity_type: 'customer', entity_id: id, ref_no: existing.customer_no, customer_id: id, action: 'updated', description: `Maklumat pelanggan dikemas kini: ${f.name}` });
    res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(id));
  });

  r.delete('/:id', requireAdmin, (req, res) => {
    const id = intId(req.params.id);
    const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!c) throw notFound('Pelanggan', 'Customer');
    const counts = db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM bookings WHERE customer_id = @id) AS b,
                (SELECT COUNT(*) FROM quotations WHERE customer_id = @id) AS q,
                (SELECT COUNT(*) FROM invoices WHERE customer_id = @id) AS i`,
      )
      .get({ id });
    if (counts.b + counts.q + counts.i > 0) {
      throw conflict(
        `Pelanggan ini mempunyai ${counts.b} tempahan, ${counts.q} sebut harga dan ${counts.i} invois. Padam atau batalkan rekod tersebut dahulu.`,
        `This customer has ${counts.b} bookings, ${counts.q} quotations and ${counts.i} invoices. Remove those records first.`,
      );
    }
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    logActivity(db, req.user, { entity_type: 'customer', entity_id: id, ref_no: c.customer_no, action: 'deleted', description: `Pelanggan dipadam: ${c.name}` });
    res.json({ ok: true });
  });

  return r;
}
