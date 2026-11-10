// Regression tests for issues found in the PR #3 code review.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';
import { sweepStatuses } from '../server/lib/finance.js';

const db = openDb(':memory:');
let server;
let base;

function client() {
  let cookie = '';
  return async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'BMS', 'X-Lang': 'en', Cookie: cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, data: await res.json().catch(() => null) };
  };
}
const api = client();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
const plus = (n) => {
  const d = new Date(today + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
let customer;

async function approvedQuotation(extra = {}) {
  const q = (
    await api('POST', '/quotations', {
      customer_id: customer.id,
      quotation_date: today,
      valid_until: plus(14),
      event_name: 'Majlis',
      event_date: plus(30),
      items: [{ description: 'Gamelan', quantity: 1, unit_price: 100000 }],
      ...extra,
    })
  ).data;
  await api('POST', `/quotations/${q.id}/status`, { status: 'Approved' });
  return q;
}

before(async () => {
  server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  await api('POST', '/auth/setup', { name: 'Admin', email: 'admin@example.com', password: 'password123' });
  customer = (await api('POST', '/customers', { name: 'Puan Annie' })).data;
});
after(() => server.close());

test('convert-booking after payments: booking shows Deposit Paid and its payments', async () => {
  const q = await approvedQuotation();
  const inv = (await api('POST', `/quotations/${q.id}/convert-invoice`)).data;
  assert.equal(inv.booking_id, null);
  await api('POST', `/invoices/${inv.id}/payments`, { amount: 50000, method: 'Cash' });
  const b = await api('POST', `/quotations/${q.id}/convert-booking`, { start_time: '20:00', end_time: '23:00' });
  assert.equal(b.status, 201);
  const detail = (await api('GET', `/bookings/${b.data.id}`)).data;
  assert.equal(detail.status, 'Deposit Paid');
  assert.equal(detail.payments.length, 1);
  assert.equal(detail.summary.deposits, 50000);
  assert.equal(detail.summary.paid, 50000);
});

test('convert-booking validates times', async () => {
  const q = await approvedQuotation();
  assert.equal((await api('POST', `/quotations/${q.id}/convert-booking`, { start_time: '25:99' })).status, 400);
  assert.equal((await api('POST', `/quotations/${q.id}/convert-booking`, { start_time: '20:00', end_time: '08:00' })).status, 400);
});

test('failed user update (bad password) changes nothing', async () => {
  await api('POST', '/users', { name: 'Staff', email: 'staff@example.com', password: 'password123', role: 'staff' });
  const staff = (await api('GET', '/users')).data.find((u) => u.email === 'staff@example.com');
  const r = await api('PUT', `/users/${staff.id}`, { role: 'admin', active: false, password: 'short' });
  assert.equal(r.status, 400);
  const after2 = (await api('GET', '/users')).data.find((u) => u.id === staff.id);
  assert.equal(after2.role, 'staff');
  assert.equal(after2.active, 1);
});

test('booking customer cannot change once a quotation exists', async () => {
  const other = (await api('POST', '/customers', { name: 'Encik Ali' })).data;
  const b = (await api('POST', '/bookings', { customer_id: customer.id, event_name: 'Kenduri', event_date: plus(40) })).data;
  await api('POST', `/bookings/${b.id}/quotation`);
  const r = await api('PUT', `/bookings/${b.id}`, { ...b, customer_id: other.id });
  assert.equal(r.status, 400);
});

test('editing a payment date re-sequences receipts', async () => {
  const q = await approvedQuotation();
  const inv = (await api('POST', `/quotations/${q.id}/convert-invoice`)).data;
  const p1 = (await api('POST', `/invoices/${inv.id}/payments`, { amount: 50000, method: 'Cash', payment_date: plus(-9) })).data.payment;
  const p2 = (await api('POST', `/invoices/${inv.id}/payments`, { amount: 50000, method: 'Cash', payment_date: plus(-1) })).data.payment;
  assert.equal(p1.payment_type, 'Deposit');
  assert.equal(p2.payment_type, 'Balance');
  // Move the first payment after the second
  await api('PUT', `/payments/${p1.id}`, { payment_date: today, method: 'Cash' });
  const a = (await api('GET', `/payments/${p1.id}`)).data;
  const b = (await api('GET', `/payments/${p2.id}`)).data;
  assert.equal(b.payment_type, 'Deposit');
  assert.equal(b.balance_after, 50000);
  assert.equal(a.payment_type, 'Balance');
  assert.equal(a.balance_after, 0);
  assert.equal(a.paid_to_date, 100000);
});

test('cancelling a booking closes its open invoices but keeps received deposits', async () => {
  const b = (await api('POST', '/bookings', { customer_id: customer.id, event_name: 'Batal', event_date: plus(50) })).data;
  const inv = (await api('POST', `/bookings/${b.id}/invoice`)).data;
  await api('PUT', `/invoices/${inv.id}`, { ...inv, items: [{ description: 'Gamelan', quantity: 1, unit_price: 500000 }], status: 'Sent' });
  await api('POST', `/invoices/${inv.id}/payments`, { amount: 250000, method: 'Bank Transfer' });
  const before2 = (await api('GET', '/payments/summary')).data.total_outstanding;
  await api('POST', `/bookings/${b.id}/status`, { status: 'Cancelled', reason: 'Pelanggan batal' });
  const i2 = (await api('GET', `/invoices/${inv.id}`)).data;
  assert.equal(i2.status, 'Cancelled');
  assert.equal(i2.amount_paid, 250000);
  const s = (await api('GET', '/payments/summary')).data;
  assert.equal(s.total_outstanding, before2 - 250000);
  const coll = (await api('GET', `/reports/collections?from=${today.slice(0, 4)}-01-01&to=${today.slice(0, 4)}-12-31`)).data;
  assert.ok(coll.rows.some((r) => r.invoice_no === inv.invoice_no), 'deposit still counted as collected');
});

test('changing password signs out other sessions', async () => {
  const other = client();
  assert.equal((await other('POST', '/auth/login', { email: 'admin@example.com', password: 'password123' })).status, 200);
  assert.equal((await other('GET', '/auth/me')).status, 200);
  assert.equal((await api('POST', '/auth/change-password', { current_password: 'password123', new_password: 'newpassword1' })).status, 200);
  assert.equal((await other('GET', '/auth/me')).status, 401, 'old session revoked');
  assert.equal((await api('GET', '/auth/me')).status, 200, 'current session kept');
});

test('sweep marks settled overdue invoices as Paid', async () => {
  const q = await approvedQuotation();
  const inv = (await api('POST', `/quotations/${q.id}/convert-invoice`)).data;
  db.prepare("UPDATE invoices SET status = 'Overdue', amount_paid = total, balance = 0 WHERE id = ?").run(inv.id);
  sweepStatuses(db);
  assert.equal(db.prepare('SELECT status FROM invoices WHERE id = ?').get(inv.id).status, 'Paid');
});

test('duplicate invoice due date never falls after the event', async () => {
  const q = await approvedQuotation({ event_date: plus(3) });
  const inv = (await api('POST', `/quotations/${q.id}/convert-invoice`)).data;
  const dup = (await api('POST', `/invoices/${inv.id}/duplicate`)).data;
  assert.equal(dup.due_date, plus(3));
});
