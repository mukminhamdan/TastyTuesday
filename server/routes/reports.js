import { Router } from 'express';
import { bad, str, today } from '../lib/http.js';
import { sweepStatuses } from '../lib/finance.js';

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
}

function monthKeys(from, to) {
  const out = [];
  let [y, m] = from.slice(0, 7).split('-').map(Number);
  const [ty, tm] = to.slice(0, 7).split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) (m = 1), y++;
    if (out.length > 240) break;
  }
  return out;
}

export default function reportRoutes(db) {
  const r = Router();

  r.get('/:type', (req, res) => {
    sweepStatuses(db);
    const t = today();
    const from = str(req.query.from, 10) || `${t.slice(0, 4)}-01-01`;
    const to = str(req.query.to, 10) || `${t.slice(0, 4)}-12-31`;
    if (from > to) throw bad('Tarikh mula mestilah sebelum tarikh akhir', 'Start date must be before end date');
    const p = { from, to };
    const all = (sql, params = p) => db.prepare(sql).all(params);
    let out;

    switch (req.params.type) {
      case 'bookings-monthly': {
        const rows = all(
          `SELECT b.*, c.name AS customer_name,
             (SELECT COALESCE(SUM(total),0) FROM invoices i WHERE i.booking_id = b.id AND i.status != 'Cancelled') AS invoiced
           FROM bookings b JOIN customers c ON c.id = b.customer_id
           WHERE b.event_date BETWEEN @from AND @to ORDER BY b.event_date`,
        );
        const months = monthKeys(from, to).map((k) => {
          const inMonth = rows.filter((b) => b.event_date.startsWith(k));
          return {
            period: k,
            total: inMonth.length,
            confirmed: inMonth.filter((b) => !['New Enquiry', 'Pending Quotation', 'Quotation Sent', 'Awaiting Confirmation', 'Cancelled'].includes(b.status)).length,
            completed: inMonth.filter((b) => b.status === 'Completed').length,
            cancelled: inMonth.filter((b) => b.status === 'Cancelled').length,
            value: inMonth.filter((b) => b.status !== 'Cancelled').reduce((s, b) => s + b.invoiced, 0),
          };
        });
        out = { rows: months, details: rows, summary: sum(months, ['total', 'confirmed', 'completed', 'cancelled', 'value']) };
        break;
      }
      case 'bookings-annual': {
        const rows = all(
          `SELECT substr(b.event_date,1,4) AS period, COUNT(*) AS total,
             SUM(CASE WHEN b.status IN ('Confirmed','Deposit Paid','Fully Paid','Completed') THEN 1 ELSE 0 END) AS confirmed,
             SUM(CASE WHEN b.status = 'Completed' THEN 1 ELSE 0 END) AS completed,
             SUM(CASE WHEN b.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled,
             COALESCE(SUM(CASE WHEN b.status != 'Cancelled' THEN (SELECT COALESCE(SUM(total),0) FROM invoices i WHERE i.booking_id = b.id AND i.status != 'Cancelled') END),0) AS value
           FROM bookings b WHERE b.event_date BETWEEN @from AND @to GROUP BY period ORDER BY period`,
        );
        out = { rows, summary: sum(rows, ['total', 'confirmed', 'completed', 'cancelled', 'value']) };
        break;
      }
      case 'revenue': {
        const inv = all(
          `SELECT substr(invoice_date,1,7) AS k, SUM(total) AS invoiced, SUM(tax_amount) AS tax, SUM(discount_amount) AS discount, COUNT(*) AS n
           FROM invoices WHERE status NOT IN ('Cancelled','Draft') AND invoice_date BETWEEN @from AND @to GROUP BY k`,
        );
        const pay = all(
          `SELECT substr(payment_date,1,7) AS k, SUM(amount) AS collected FROM payments
           WHERE status = 'Valid' AND payment_date BETWEEN @from AND @to GROUP BY k`,
        );
        const rows = monthKeys(from, to).map((k) => {
          const i = inv.find((x) => x.k === k) || {};
          const pm = pay.find((x) => x.k === k) || {};
          return { period: k, invoice_count: i.n || 0, invoiced: i.invoiced || 0, discount: i.discount || 0, tax: i.tax || 0, collected: pm.collected || 0 };
        });
        out = { rows, summary: sum(rows, ['invoice_count', 'invoiced', 'discount', 'tax', 'collected']) };
        break;
      }
      case 'customers': {
        const rows = all(
          `SELECT c.id, c.customer_no, c.name, c.company, c.category, c.phone,
             (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id AND b.event_date BETWEEN @from AND @to) AS bookings,
             (SELECT COUNT(*) FROM quotations q WHERE q.customer_id = c.id AND q.quotation_date BETWEEN @from AND @to) AS quotations,
             (SELECT COALESCE(SUM(total),0) FROM invoices i WHERE i.customer_id = c.id AND i.status NOT IN ('Cancelled','Draft') AND i.invoice_date BETWEEN @from AND @to) AS invoiced,
             (SELECT COALESCE(SUM(amount),0) FROM payments p WHERE p.customer_id = c.id AND p.status = 'Valid' AND p.payment_date BETWEEN @from AND @to) AS paid,
             (SELECT COALESCE(SUM(balance),0) FROM invoices i WHERE i.customer_id = c.id AND i.status IN ('Sent','Partially Paid','Overdue')) AS outstanding
           FROM customers c ORDER BY invoiced DESC, c.name`,
        );
        const active = rows.filter((x) => x.bookings || x.quotations || x.invoiced || x.paid || x.outstanding);
        const byCategory = {};
        for (const x of active) {
          const k = x.category || '-';
          byCategory[k] = byCategory[k] || { category: k, customers: 0, invoiced: 0 };
          byCategory[k].customers++;
          byCategory[k].invoiced += x.invoiced;
        }
        out = {
          rows: active,
          by_category: Object.values(byCategory),
          summary: { customers: active.length, total_customers: rows.length, ...sum(active, ['bookings', 'quotations', 'invoiced', 'paid', 'outstanding']) },
        };
        break;
      }
      case 'outstanding': {
        const rows = all(
          `SELECT i.id, i.invoice_no, i.invoice_date, i.due_date, i.total, i.amount_paid, i.balance, i.status, c.name AS customer_name, c.phone AS customer_phone, b.booking_no
           FROM invoices i JOIN customers c ON c.id = i.customer_id LEFT JOIN bookings b ON b.id = i.booking_id
           WHERE i.status IN ('Sent','Partially Paid','Overdue') AND i.balance > 0 AND i.invoice_date <= @to
           ORDER BY i.due_date`,
          { to },
        ).map((x) => {
          const d = daysBetween(x.due_date, t);
          return { ...x, days_overdue: Math.max(0, d), aging: d <= 0 ? 'current' : d <= 30 ? '1-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : '90+' };
        });
        const buckets = ['current', '1-30', '31-60', '61-90', '90+'].map((k) => ({
          bucket: k,
          count: rows.filter((x) => x.aging === k).length,
          amount: rows.filter((x) => x.aging === k).reduce((s, x) => s + x.balance, 0),
        }));
        out = { rows, buckets, summary: { count: rows.length, ...sum(rows, ['total', 'amount_paid', 'balance']) } };
        break;
      }
      case 'collections': {
        const rows = all(
          `SELECT p.id, p.receipt_no, p.payment_date, p.amount, p.method, p.reference, p.payment_type, p.received_by,
             i.invoice_no, b.booking_no, c.name AS customer_name
           FROM payments p JOIN invoices i ON i.id = p.invoice_id JOIN customers c ON c.id = p.customer_id LEFT JOIN bookings b ON b.id = p.booking_id
           WHERE p.status = 'Valid' AND p.payment_date BETWEEN @from AND @to ORDER BY p.payment_date, p.id`,
        );
        const methods = {};
        for (const x of rows) {
          methods[x.method] = methods[x.method] || { method: x.method, count: 0, amount: 0 };
          methods[x.method].count++;
          methods[x.method].amount += x.amount;
        }
        const monthly = monthKeys(from, to).map((k) => ({ period: k, amount: rows.filter((x) => x.payment_date.startsWith(k)).reduce((s, x) => s + x.amount, 0) }));
        out = {
          rows,
          by_method: Object.values(methods),
          monthly,
          summary: { count: rows.length, amount: rows.reduce((s, x) => s + x.amount, 0), deposits: rows.filter((x) => x.payment_type === 'Deposit').reduce((s, x) => s + x.amount, 0) },
        };
        break;
      }
      case 'services': {
        const rows = all(
          `SELECT COALESCE(s.name, it.description) AS service, COUNT(DISTINCT it.invoice_id) AS invoices, SUM(it.quantity) AS quantity,
             SUM(it.amount) AS revenue, ROUND(AVG(it.unit_price)) AS avg_price
           FROM invoice_items it JOIN invoices i ON i.id = it.invoice_id LEFT JOIN services s ON s.id = it.service_id
           WHERE i.status NOT IN ('Cancelled','Draft') AND i.invoice_date BETWEEN @from AND @to
           GROUP BY COALESCE(s.name, it.description) COLLATE NOCASE ORDER BY revenue DESC`,
        );
        const quoted = all(
          `SELECT COALESCE(s.name, it.description) AS service, COUNT(*) AS quoted,
             SUM(CASE WHEN q.status = 'Approved' THEN 1 ELSE 0 END) AS approved
           FROM quotation_items it JOIN quotations q ON q.id = it.quotation_id LEFT JOIN services s ON s.id = it.service_id
           WHERE q.quotation_date BETWEEN @from AND @to GROUP BY COALESCE(s.name, it.description) COLLATE NOCASE`,
        );
        const merged = rows.map((x) => {
          const qd = quoted.find((y) => y.service.toLowerCase() === x.service.toLowerCase()) || {};
          return { ...x, quoted: qd.quoted || 0, approved: qd.approved || 0 };
        });
        for (const qd of quoted) {
          if (!merged.find((x) => x.service.toLowerCase() === qd.service.toLowerCase())) {
            merged.push({ service: qd.service, invoices: 0, quantity: 0, revenue: 0, avg_price: 0, quoted: qd.quoted, approved: qd.approved });
          }
        }
        out = { rows: merged, summary: sum(merged, ['invoices', 'quantity', 'revenue', 'quoted', 'approved']) };
        break;
      }
      case 'cancelled': {
        const rows = all(
          `SELECT b.id, b.booking_no, b.event_name, b.event_type, b.event_date, b.cancel_reason, b.cancelled_at, c.name AS customer_name,
             (SELECT COALESCE(SUM(total),0) FROM quotations q WHERE q.booking_id = b.id AND q.status = 'Approved') AS quoted,
             (SELECT COALESCE(SUM(amount),0) FROM payments p WHERE p.booking_id = b.id AND p.status = 'Valid') AS paid
           FROM bookings b JOIN customers c ON c.id = b.customer_id
           WHERE b.status = 'Cancelled' AND b.event_date BETWEEN @from AND @to ORDER BY b.event_date`,
        );
        const total = db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE event_date BETWEEN @from AND @to').get(p).n;
        out = { rows, summary: { count: rows.length, total_bookings: total, rate: total ? Math.round((rows.length / total) * 1000) / 10 : 0, ...sum(rows, ['quoted', 'paid']) } };
        break;
      }
      default:
        throw bad('Jenis laporan tidak sah', 'Unknown report type');
    }
    res.json({ type: req.params.type, from, to, generated_at: new Date().toISOString(), ...out });
  });

  return r;
}

function sum(rows, keys) {
  const o = {};
  for (const k of keys) o[k] = rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  return o;
}
