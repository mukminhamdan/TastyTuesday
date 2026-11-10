// End-to-end API test of the complete business workflow:
// customer -> booking -> quotation -> approve -> invoice -> 50% deposit -> receipt
// -> balance -> final receipt -> invoice PAID -> booking Fully Paid -> Completed -> reports.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';
import { calcTotals, rmToSen } from '../shared/calc.js';

let server;
let base;
let cookie = '';
const db = openDb(':memory:');

async function api(method, url, body) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'BMS', 'X-Lang': 'en', Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
const year = today.slice(0, 4);
const future = (days) => {
  const d = new Date(today + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

before(async () => {
  server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const ctx = {};

test('calculations are exact in sen', () => {
  const t = calcTotals({
    items: [
      { quantity: 3, unit_price: 33333 },
      { quantity: 1.5, unit_price: 10001 },
    ],
    discount_type: 'percent',
    discount_value: 10,
    additional_charges: 5000,
    tax_enabled: true,
    tax_rate: 8,
  });
  assert.equal(t.subtotal, 99999 + 15002);
  assert.equal(t.discount_amount, 11500); // 10% of 115001 = 11500.1
  assert.equal(t.taxable, 115001 - 11500 + 5000);
  assert.equal(t.tax_amount, Math.round(108501 * 0.08));
  assert.equal(t.total, 108501 + 8680);
  assert.equal(rmToSen('1,234.50'), 123450);
  assert.ok(Number.isNaN(rmToSen('12.345')));
});

test('security: API requires auth and CSRF header', async () => {
  assert.equal((await api('GET', '/customers')).status, 401);
  const r = await fetch(base + '/auth/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 403);
});

test('first-run setup creates admin and signs in', async () => {
  const r = await api('POST', '/auth/setup', { name: 'Admin', email: 'admin@example.com', password: 'password123', business_name: 'Tasty Tuesday Enterprise' });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, 'admin');
  assert.equal((await api('POST', '/auth/setup', { name: 'X', email: 'x@example.com', password: 'password123' })).status, 409);
  await api('PUT', '/settings', { bank_name: 'Maybank', bank_account_no: '5123 4567 8901', bank_account_name: 'Tasty Tuesday Enterprise' });
  const svc = await api('POST', '/services', { name: 'Pakej Persembahan Kompang', unit_price: 150000, is_package: true, unit: 'pakej' });
  assert.equal(svc.status, 201);
  await api('POST', '/services', { name: 'Sistem PA', unit_price: 50000, unit: 'set' });
});

test('1. register a new customer', async () => {
  const bad = await api('POST', '/customers', { name: '', email: 'not-an-email' });
  assert.equal(bad.status, 400);
  const r = await api('POST', '/customers', {
    name: 'Syarikat Maju Jaya Sdn Bhd',
    company: 'Maju Jaya Sdn Bhd',
    contact_person: 'Encik Ahmad',
    phone: '012-345 6789',
    email: 'ahmad@majujaya.my',
    billing_address: 'No. 1, Jalan Ampang, 50450 Kuala Lumpur',
    event_location: 'Dewan Merdeka, PWTC',
    category: 'Korporat',
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.customer_no, 'CUS-0001');
  ctx.customer = r.data;
});

test('2. create a booking (with overlap detection)', async () => {
  const body = {
    customer_id: ctx.customer.id,
    event_name: 'Majlis Makan Malam Tahunan',
    event_type: 'Majlis Korporat',
    event_date: future(30),
    start_time: '19:00',
    end_time: '23:00',
    venue: 'Dewan Merdeka, PWTC',
    services: ['Sistem PA'],
    package: 'Pakej Persembahan Kompang',
    pax: 12,
  };
  const r = await api('POST', '/bookings', body);
  assert.equal(r.status, 201);
  assert.equal(r.data.booking_no, `BK-${future(30).slice(0, 4)}-0001`);
  assert.equal(r.data.status, 'New Enquiry');
  ctx.booking = r.data;

  const clash = await api('POST', '/bookings', { ...body, event_name: 'Clash', start_time: '22:00', end_time: '23:30' });
  assert.equal(clash.status, 409);
  assert.equal(clash.data.code, 'OVERLAP');
  assert.equal(clash.data.conflicts[0].id, ctx.booking.id);
  const noClash = await api('POST', '/bookings', { ...body, event_name: 'Morning show', start_time: '09:00', end_time: '12:00' });
  assert.equal(noClash.status, 201);
  ctx.otherBooking = noClash.data;
});

test('3. generate a quotation from the booking', async () => {
  const r = await api('POST', `/bookings/${ctx.booking.id}/quotation`);
  assert.equal(r.status, 201);
  const q = r.data;
  assert.equal(q.quotation_no, `QT-${year}-0001`);
  assert.equal(q.customer_id, ctx.customer.id);
  assert.equal(q.event_name, 'Majlis Makan Malam Tahunan');
  assert.deepEqual(q.items.map((i) => [i.description, i.unit_price]), [
    ['Pakej Persembahan Kompang', 150000],
    ['Sistem PA', 50000],
  ]);
  // Edit: add an item, 10% discount, RM 200 transport, SST 8%
  const upd = await api('PUT', `/quotations/${q.id}`, {
    ...q,
    tax_enabled: true,
    tax_rate: 8,
    discount_type: 'percent',
    discount_value: 10,
    additional_label: 'Pengangkutan',
    additional_charges: 20000,
    items: [...q.items, { description: 'Penari tambahan', quantity: 4, unit_price: 25000 }],
    status: 'Sent',
  });
  assert.equal(upd.status, 200);
  // subtotal 1500+500+1000 = 3000.00; -10% = 2700; +200 = 2900; SST 8% = 232; total 3132.00
  assert.equal(upd.data.subtotal, 300000);
  assert.equal(upd.data.discount_amount, 30000);
  assert.equal(upd.data.tax_amount, 23200);
  assert.equal(upd.data.total, 313200);
  assert.equal(upd.data.status, 'Sent');
  const b = await api('GET', `/bookings/${ctx.booking.id}`);
  assert.equal(b.data.status, 'Quotation Sent');
  ctx.quotation = upd.data;
});

test('3b. public share link marks quotation as Viewed', async () => {
  const s = await api('POST', `/quotations/${ctx.quotation.id}/share`);
  const saved = cookie;
  cookie = '';
  const pub = await api('GET', `/public/quotation/${s.data.token}`);
  cookie = saved;
  assert.equal(pub.status, 200);
  assert.equal(pub.data.doc.status, 'Viewed');
  assert.equal(pub.data.settings.bank_name, 'Maybank');
  assert.equal(pub.data.settings.__jwt_secret, undefined);
});

test('4. approve the quotation -> booking confirmed', async () => {
  const r = await api('POST', `/quotations/${ctx.quotation.id}/status`, { status: 'Approved' });
  assert.equal(r.status, 200);
  assert.equal(r.data.status, 'Approved');
  const b = await api('GET', `/bookings/${ctx.booking.id}`);
  assert.equal(b.data.status, 'Confirmed');
  // Approved quotations are locked
  assert.equal((await api('PUT', `/quotations/${ctx.quotation.id}`, { ...r.data })).status, 400);
});

test('5. convert quotation into invoice (no re-entry)', async () => {
  const r = await api('POST', `/quotations/${ctx.quotation.id}/convert-invoice`);
  assert.equal(r.status, 201);
  const inv = r.data;
  assert.equal(inv.invoice_no, `INV-${year}-0001`);
  assert.equal(inv.booking_id, ctx.booking.id);
  assert.equal(inv.quotation_id, ctx.quotation.id);
  assert.equal(inv.total, 313200);
  assert.equal(inv.balance, 313200);
  assert.equal(inv.items.length, 3);
  assert.equal(inv.deposit_required, 156600);
  const dup = await api('POST', `/quotations/${ctx.quotation.id}/convert-invoice`);
  assert.equal(dup.status, 409);
  const sent = await api('POST', `/invoices/${inv.id}/status`, { status: 'Sent' });
  assert.equal(sent.data.status, 'Sent');
  ctx.invoice = sent.data;
});

test('6+7. record 50% deposit -> deposit receipt generated', async () => {
  const over = await api('POST', `/invoices/${ctx.invoice.id}/payments`, { amount: 999999999, method: 'Cash', payment_date: today });
  assert.equal(over.status, 400);
  const r = await api('POST', `/invoices/${ctx.invoice.id}/payments`, {
    amount: 156600,
    method: 'Bank Transfer',
    reference: 'MBB123456',
    payment_date: today,
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.payment.receipt_no, `RC-${year}-0001`);
  assert.equal(r.data.payment.payment_type, 'Deposit');
  assert.equal(r.data.payment.balance_after, 156600);
  assert.equal(r.data.invoice.status, 'Partially Paid');
  assert.equal(r.data.invoice.amount_paid, 156600);
  assert.equal(r.data.invoice.deposit_paid, 156600);
  const b = await api('GET', `/bookings/${ctx.booking.id}`);
  assert.equal(b.data.status, 'Deposit Paid');
  const receipt = await api('GET', `/payments/${r.data.payment.id}`);
  assert.equal(receipt.data.invoice_no, ctx.invoice.invoice_no);
  assert.equal(receipt.data.booking_no, ctx.booking.booking_no);
  ctx.deposit = r.data.payment;
});

test('8+9+10+11. record remaining 50% -> final receipt, invoice PAID, booking Fully Paid', async () => {
  const r = await api('POST', `/invoices/${ctx.invoice.id}/payments`, { amount: 156600, method: 'DuitNow', payment_date: today });
  assert.equal(r.status, 201);
  assert.equal(r.data.payment.receipt_no, `RC-${year}-0002`);
  assert.equal(r.data.payment.payment_type, 'Balance');
  assert.equal(r.data.payment.balance_after, 0);
  assert.equal(r.data.invoice.status, 'Paid');
  assert.equal(r.data.invoice.balance, 0);
  assert.equal(r.data.invoice.payments.length, 2);
  let b = await api('GET', `/bookings/${ctx.booking.id}`);
  assert.equal(b.data.status, 'Fully Paid');
  assert.equal(b.data.summary.paid, 313200);
  assert.equal(b.data.summary.balance, 0);
  // Further payments are rejected
  assert.equal((await api('POST', `/invoices/${ctx.invoice.id}/payments`, { amount: 100, method: 'Cash' })).status, 400);
  const done = await api('POST', `/bookings/${ctx.booking.id}/status`, { status: 'Completed' });
  assert.equal(done.data.status, 'Completed');
  ctx.final = r.data.payment;
});

test('voiding a payment restores balance; numbers never reused', async () => {
  // Second booking: invoice straight from booking, pay, void, re-pay
  const inv = (await api('POST', `/bookings/${ctx.otherBooking.id}/invoice`)).data;
  assert.equal(inv.invoice_no, `INV-${year}-0002`);
  assert.equal(inv.total, 200000);
  const p = (await api('POST', `/invoices/${inv.id}/payments`, { amount: 50000, method: 'Cash' })).data;
  assert.equal(p.invoice.status, 'Partially Paid');
  const v = await api('POST', `/payments/${p.payment.id}/void`, { reason: 'Wrong amount' });
  assert.equal(v.data.status, 'Void');
  const after = (await api('GET', `/invoices/${inv.id}`)).data;
  assert.equal(after.amount_paid, 0);
  assert.equal(after.balance, 200000);
  assert.equal(after.status, 'Sent');
  assert.equal((await api('GET', `/bookings/${ctx.otherBooking.id}`)).data.status, 'Confirmed');
  const p2 = (await api('POST', `/invoices/${inv.id}/payments`, { amount: 60000, method: 'QR Payment' })).data;
  assert.equal(p2.payment.receipt_no, `RC-${year}-0004`); // RC-0003 was voided, not reused
  // Delete a quotation and check the number is not reused
  const q = (await api('POST', `/bookings/${ctx.otherBooking.id}/quotation`)).data;
  assert.equal((await api('DELETE', `/quotations/${q.id}`)).status, 200);
  const q2 = (await api('POST', `/bookings/${ctx.otherBooking.id}/quotation`)).data;
  assert.notEqual(q2.quotation_no, q.quotation_no);
  // Customer with documents cannot be deleted
  assert.equal((await api('DELETE', `/customers/${ctx.customer.id}`)).status, 409);
  ctx.inv2 = inv;
});

test('12. reports and financial totals agree', async () => {
  const from = `${year}-01-01`;
  const to = `${Number(year) + 1}-12-31`;
  const summary = (await api('GET', `/payments/summary?from=${from}&to=${to}`)).data;
  assert.equal(summary.total_invoiced, 313200 + 200000);
  assert.equal(summary.total_collected, 313200 + 60000);
  assert.equal(summary.total_outstanding, 140000);
  assert.equal(summary.deposits_received, 156600 + 60000); // re-payment after void is the deposit for invoice 2

  const revenue = (await api('GET', `/reports/revenue?from=${from}&to=${to}`)).data;
  assert.equal(revenue.summary.invoiced, 513200);
  assert.equal(revenue.summary.collected, 373200);
  assert.equal(revenue.summary.tax, 23200);

  const coll = (await api('GET', `/reports/collections?from=${from}&to=${to}`)).data;
  assert.equal(coll.summary.count, 3);
  assert.equal(coll.summary.amount, 373200);

  const out = (await api('GET', `/reports/outstanding?from=${from}&to=${to}`)).data;
  assert.equal(out.rows.length, 1);
  assert.equal(out.summary.balance, 140000);

  const cust = (await api('GET', `/reports/customers?from=${from}&to=${to}`)).data;
  assert.equal(cust.rows[0].invoiced, 513200);
  assert.equal(cust.rows[0].paid, 373200);
  assert.equal(cust.rows[0].outstanding, 140000);

  const svc = (await api('GET', `/reports/services?from=${from}&to=${to}`)).data;
  const kompang = svc.rows.find((r) => r.service === 'Pakej Persembahan Kompang');
  assert.equal(kompang.invoices, 2);
  assert.equal(kompang.revenue, 300000);

  for (const type of ['bookings-monthly', 'bookings-annual', 'cancelled']) {
    assert.equal((await api('GET', `/reports/${type}?from=${from}&to=${to}`)).status, 200);
  }
  const annual = (await api('GET', `/reports/bookings-annual?from=${from}&to=${to}`)).data;
  assert.equal(annual.summary.total, 2);
  assert.equal(annual.summary.completed, 1);

  const dash = (await api('GET', `/dashboard?from=${from}&to=${to}`)).data;
  assert.equal(dash.stats.total_revenue, 513200);
  assert.equal(dash.stats.payments_received, 373200);
  assert.equal(dash.stats.outstanding, 140000);
  assert.ok(dash.activity.length > 5);
});

test('backup and restore round-trip', async () => {
  const backup = (await api('GET', '/backup/export')).data;
  assert.equal(backup.app, 'tastytuesday-bms');
  assert.ok(!backup.data.settings.some((s) => s.key.startsWith('__')));
  await api('POST', '/customers', { name: 'Temp customer' });
  const r = await api('POST', '/backup/restore', backup);
  assert.equal(r.status, 200);
  const customers = (await api('GET', '/customers')).data;
  assert.equal(customers.length, 1);
  const inv = (await api('GET', `/invoices/${ctx.invoice.id}`)).data;
  assert.equal(inv.status, 'Paid');
  // Counter survives restore: next customer is not CUS-0001
  const c = (await api('POST', '/customers', { name: 'After restore' })).data;
  assert.equal(c.customer_no, 'CUS-0002');
});

test('numbering can continue an existing paper sequence (e.g. invoice 0211)', async () => {
  // Plain numbers without prefix or year, like the business's existing invoices (No Invois 0210)
  const s = await api('PUT', '/settings', { prefix_invoice: '', number_include_year: false });
  assert.equal(s.status, 200);
  // Cannot move a sequence backwards
  assert.equal((await api('PUT', '/settings/counters', { invoice: 0 })).status, 400);
  const c = await api('PUT', '/settings/counters', { invoice: 211 });
  assert.equal(c.status, 200);
  assert.equal(c.data.invoice.preview, '0211');
  const inv = (await api('POST', `/quotations/${ctx.quotation.id}/convert-invoice`, { force: true })).data;
  assert.equal(inv.invoice_no, '0211');
  const inv2 = (await api('POST', `/invoices/${inv.id}/duplicate`)).data;
  assert.equal(inv2.invoice_no, '0212');
  // After moving forward, going back below an issued number is refused
  assert.equal((await api('PUT', '/settings/counters', { invoice: 212 })).status, 400);
  // Customer prefix may not be empty
  assert.equal((await api('PUT', '/settings', { prefix_customer: '' })).status, 400);
});
