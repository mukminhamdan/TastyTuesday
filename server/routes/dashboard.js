import { Router } from 'express';
import { str, today, addDays } from '../lib/http.js';
import { sweepStatuses } from '../lib/finance.js';

export default function dashboardRoutes(db) {
  const r = Router();

  r.get('/', (req, res) => {
    sweepStatuses(db);
    const t = today();
    const from = str(req.query.from, 10) || t.slice(0, 7) + '-01';
    const to = str(req.query.to, 10) || t.slice(0, 7) + '-31';
    const year = Number(req.query.year) || Number(to.slice(0, 4));
    const p = { from, to, t };

    const one = (sql, params = p) => db.prepare(sql).get(params);
    const stats = {
      total_bookings: one("SELECT COUNT(*) AS n FROM bookings WHERE status != 'Cancelled' AND event_date BETWEEN @from AND @to").n,
      upcoming_bookings: one("SELECT COUNT(*) AS n FROM bookings WHERE status NOT IN ('Cancelled','Completed') AND event_date >= @t").n,
      pending_quotations: one("SELECT COUNT(*) AS n FROM quotations WHERE status IN ('Draft','Sent','Viewed')").n,
      pending_quotations_value: one("SELECT COALESCE(SUM(total),0) AS s FROM quotations WHERE status IN ('Draft','Sent','Viewed')").s,
      approved_quotations: one("SELECT COUNT(*) AS n FROM quotations WHERE status = 'Approved' AND quotation_date BETWEEN @from AND @to").n,
      approved_quotations_value: one("SELECT COALESCE(SUM(total),0) AS s FROM quotations WHERE status = 'Approved' AND quotation_date BETWEEN @from AND @to").s,
      total_invoices: one("SELECT COUNT(*) AS n FROM invoices WHERE status != 'Cancelled' AND invoice_date BETWEEN @from AND @to").n,
      outstanding: one("SELECT COALESCE(SUM(balance),0) AS s FROM invoices WHERE status IN ('Sent','Partially Paid','Overdue')").s,
      overdue: one("SELECT COALESCE(SUM(balance),0) AS s FROM invoices WHERE status = 'Overdue'").s,
      total_revenue: one("SELECT COALESCE(SUM(total),0) AS s FROM invoices WHERE status NOT IN ('Cancelled','Draft') AND invoice_date BETWEEN @from AND @to").s,
      payments_received: one("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE status = 'Valid' AND payment_date BETWEEN @from AND @to").s,
    };

    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, invoiced: 0, collected: 0, bookings: 0 }));
    const y = String(year);
    for (const row of db
      .prepare("SELECT CAST(substr(invoice_date,6,2) AS INTEGER) AS m, SUM(total) AS s FROM invoices WHERE status NOT IN ('Cancelled','Draft') AND substr(invoice_date,1,4) = ? GROUP BY m")
      .all(y))
      monthly[row.m - 1].invoiced = row.s;
    for (const row of db
      .prepare("SELECT CAST(substr(payment_date,6,2) AS INTEGER) AS m, SUM(amount) AS s FROM payments WHERE status = 'Valid' AND substr(payment_date,1,4) = ? GROUP BY m")
      .all(y))
      monthly[row.m - 1].collected = row.s;
    for (const row of db
      .prepare("SELECT CAST(substr(event_date,6,2) AS INTEGER) AS m, COUNT(*) AS n FROM bookings WHERE status != 'Cancelled' AND substr(event_date,1,4) = ? GROUP BY m")
      .all(y))
      monthly[row.m - 1].bookings = row.n;

    const upcoming = db
      .prepare(
        `SELECT b.id, b.booking_no, b.event_name, b.event_date, b.start_time, b.end_time, b.venue, b.status, c.name AS customer_name
         FROM bookings b JOIN customers c ON c.id = b.customer_id
         WHERE b.event_date >= ? AND b.status NOT IN ('Cancelled','Completed')
         ORDER BY b.event_date, b.start_time LIMIT 8`,
      )
      .all(t);

    const reminders = db
      .prepare(
        `SELECT i.id, i.invoice_no, i.due_date, i.balance, i.total, i.status, c.name AS customer_name, c.phone AS customer_phone
         FROM invoices i JOIN customers c ON c.id = i.customer_id
         WHERE i.status IN ('Sent','Partially Paid','Overdue') AND i.balance > 0 AND i.due_date <= ?
         ORDER BY i.due_date LIMIT 10`,
      )
      .all(addDays(t, 7));

    const expiring = db
      .prepare(
        `SELECT q.id, q.quotation_no, q.valid_until, q.total, q.status, c.name AS customer_name
         FROM quotations q JOIN customers c ON c.id = q.customer_id
         WHERE q.status IN ('Sent','Viewed') AND q.valid_until BETWEEN ? AND ? ORDER BY q.valid_until LIMIT 5`,
      )
      .all(t, addDays(t, 7));

    const activity = db
      .prepare(
        `SELECT a.*, c.name AS customer_name FROM activity_log a LEFT JOIN customers c ON c.id = a.customer_id
         ORDER BY a.id DESC LIMIT 15`,
      )
      .all();

    const years = db
      .prepare(
        `SELECT DISTINCT y FROM (
           SELECT substr(event_date,1,4) AS y FROM bookings UNION SELECT substr(invoice_date,1,4) FROM invoices
           UNION SELECT substr(payment_date,1,4) FROM payments) WHERE y IS NOT NULL ORDER BY y DESC`,
      )
      .all()
      .map((r) => Number(r.y));

    res.json({ from, to, year, today: t, stats, monthly, upcoming, reminders, expiring, activity, years });
  });

  return r;
}
