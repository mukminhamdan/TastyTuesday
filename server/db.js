import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DEFAULT_PREFIXES } from '../shared/constants.js';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || 'data');

// ---------------------------------------------------------------------------
// Schema. Money columns are INTEGER sen. Dates are 'YYYY-MM-DD' text,
// times 'HH:MM', timestamps are UTC 'YYYY-MM-DD HH:MM:SS'.
// ---------------------------------------------------------------------------
const MIGRATIONS = [
  // v1 - initial schema
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
    active INTEGER NOT NULL DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Document sequence counters. Rows are only ever incremented, so numbers
  -- from deleted / cancelled documents are never reused.
  CREATE TABLE counters (
    doc_type TEXT NOT NULL,
    year INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (doc_type, year)
  );

  CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    customer_no TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    company TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    billing_address TEXT,
    event_location TEXT,
    category TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Service / package catalogue used to fill bookings and document line items.
  CREATE TABLE services (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT,
    unit_price INTEGER NOT NULL DEFAULT 0,
    is_package INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE bookings (
    id INTEGER PRIMARY KEY,
    booking_no TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    event_name TEXT NOT NULL,
    event_type TEXT,
    event_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    venue TEXT,
    event_address TEXT,
    services TEXT NOT NULL DEFAULT '[]',     -- JSON array of service names
    package TEXT,
    pax INTEGER,
    special_requirements TEXT,
    internal_notes TEXT,
    status TEXT NOT NULL DEFAULT 'New Enquiry',
    cancel_reason TEXT,
    cancelled_at TEXT,
    completed_at TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_bookings_date ON bookings(event_date);
  CREATE INDEX idx_bookings_customer ON bookings(customer_id);

  CREATE TABLE quotations (
    id INTEGER PRIMARY KEY,
    quotation_no TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    quotation_date TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    event_name TEXT,
    event_date TEXT,
    event_venue TEXT,
    discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed','percent')),
    discount_value REAL NOT NULL DEFAULT 0,
    additional_label TEXT,
    additional_charges INTEGER NOT NULL DEFAULT 0,
    tax_enabled INTEGER NOT NULL DEFAULT 0,
    tax_label TEXT,
    tax_rate REAL NOT NULL DEFAULT 0,
    subtotal INTEGER NOT NULL DEFAULT 0,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    tax_amount INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    terms TEXT,
    payment_terms TEXT,
    status TEXT NOT NULL DEFAULT 'Draft',
    share_token TEXT UNIQUE,
    sent_at TEXT, viewed_at TEXT, approved_at TEXT, rejected_at TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_quotations_customer ON quotations(customer_id);
  CREATE INDEX idx_quotations_booking ON quotations(booking_id);

  CREATE TABLE quotation_items (
    id INTEGER PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    details TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT,
    unit_price INTEGER NOT NULL DEFAULT 0,
    amount INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE invoices (
    id INTEGER PRIMARY KEY,
    invoice_no TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
    invoice_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    event_name TEXT,
    event_date TEXT,
    event_venue TEXT,
    discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed','percent')),
    discount_value REAL NOT NULL DEFAULT 0,
    additional_label TEXT,
    additional_charges INTEGER NOT NULL DEFAULT 0,
    tax_enabled INTEGER NOT NULL DEFAULT 0,
    tax_label TEXT,
    tax_rate REAL NOT NULL DEFAULT 0,
    subtotal INTEGER NOT NULL DEFAULT 0,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    tax_amount INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    deposit_percent REAL NOT NULL DEFAULT 0,
    deposit_required INTEGER NOT NULL DEFAULT 0,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    balance INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    terms TEXT,
    payment_instructions TEXT,
    status TEXT NOT NULL DEFAULT 'Draft',
    share_token TEXT UNIQUE,
    sent_at TEXT, paid_at TEXT, cancelled_at TEXT, cancel_reason TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_invoices_customer ON invoices(customer_id);
  CREATE INDEX idx_invoices_booking ON invoices(booking_id);
  CREATE INDEX idx_invoices_quotation ON invoices(quotation_id);

  CREATE TABLE invoice_items (
    id INTEGER PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    details TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT,
    unit_price INTEGER NOT NULL DEFAULT 0,
    amount INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  -- Every payment produces exactly one receipt (receipt_no). Payments are
  -- never deleted; they are voided so the receipt trail stays intact.
  CREATE TABLE payments (
    id INTEGER PRIMARY KEY,
    receipt_no TEXT NOT NULL UNIQUE,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    payment_date TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL,
    reference TEXT,
    description TEXT,
    payment_type TEXT NOT NULL DEFAULT 'Partial',
    balance_after INTEGER NOT NULL DEFAULT 0,
    received_by TEXT,
    status TEXT NOT NULL DEFAULT 'Valid' CHECK (status IN ('Valid','Void')),
    void_reason TEXT,
    voided_at TEXT,
    share_token TEXT UNIQUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_payments_invoice ON payments(invoice_id);
  CREATE INDEX idx_payments_customer ON payments(customer_id);
  CREATE INDEX idx_payments_date ON payments(payment_date);

  CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    ref_no TEXT,
    customer_id INTEGER,
    action TEXT NOT NULL,
    description TEXT,
    user_id INTEGER,
    user_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_activity_created ON activity_log(created_at);
  `,
  // v2 - session revocation: sessions carry the user's token_version
  `ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;`,
];

// Default business profile (Gita Gangsa Enterprise). Everything can be changed in Settings.
const LOGO_FILE = new URL('./assets/default-logo.jpg', import.meta.url);
const DEFAULT_LOGO = fs.existsSync(LOGO_FILE) ? `data:image/jpeg;base64,${fs.readFileSync(LOGO_FILE).toString('base64')}` : '';

export const DEFAULT_SETTINGS = {
  business_name: 'Gita Gangsa Enterprise',
  registration_no: '003060420-A',
  address: 'M-4-24, Blok M\nDesa Mutiara\n43000 Kajang, Selangor',
  phone: '019 364 7782',
  email: 'gitagangsa@gmail.com',
  website: '',
  social_media: '',
  logo: DEFAULT_LOGO,
  bank_name: 'Maybank',
  bank_account_no: '562021651487',
  bank_account_name: 'Gita Gangsa Enterprise',
  doc_template: 'boxed',
  accent_color: '#9a6b1f',
  default_language: 'ms',
  quotation_validity_days: 14,
  payment_terms_days: 14,
  deposit_percent: 50,
  tax_enabled_default: false,
  tax_rate_default: 8,
  tax_label: 'SST',
  quotation_terms:
    'Sebut harga ini sah sehingga tarikh yang dinyatakan.\nTempahan hanya disahkan selepas bayaran deposit 50% diterima.\nDeposit tidak akan dipulangkan sekiranya pihak tuan/puan membatalkan tempahan.',
  payment_terms: 'Untuk tempahan, bayaran deposit sebanyak 50% diperlukan. Baki hendaklah dijelaskan sehari selepas majlis berlangsung.',
  invoice_terms:
    'Untuk tempahan, bayaran deposit sebanyak 50% diperlukan.\nDeposit tidak akan dipulangkan sekiranya pihak tuan/puan membatalkan tempahan.\nBayaran hendaklah dijelaskan sehari selepas majlis berlangsung.',
  payment_instructions: '',
  doc_footer: '',
  signatory_name: 'Abdul Mukmin bin Hamdan',
  signatory_title: 'Pengurus',
  number_include_year: true,
  prefix_customer: DEFAULT_PREFIXES.customer,
  prefix_booking: DEFAULT_PREFIXES.booking,
  prefix_quotation: DEFAULT_PREFIXES.quotation,
  prefix_invoice: DEFAULT_PREFIXES.invoice,
  prefix_receipt: DEFAULT_PREFIXES.receipt,
  customer_categories: ['Korporat', 'Kerajaan', 'Individu', 'Sekolah / Universiti', 'NGO / Persatuan', 'Lain-lain'],
  event_types: ['Majlis Perkahwinan', 'Majlis Korporat', 'Majlis Rasmi Kerajaan', 'Persembahan Kebudayaan', 'Majlis Sekolah / Universiti', 'Festival / Karnival', 'Lain-lain'],
};

export function openDb(file = process.env.DB_FILE || path.join(DATA_DIR, 'bms.sqlite')) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  seedSettings(db);
  return db;
}

function migrate(db) {
  const version = db.pragma('user_version', { simple: true });
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}

function seedSettings(db) {
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  db.transaction(() => {
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insert.run(k, JSON.stringify(v));
    insert.run('__jwt_secret', JSON.stringify(crypto.randomBytes(48).toString('hex')));
    // Starter service catalogue (only on a brand-new database)
    if (!db.prepare("SELECT 1 FROM settings WHERE key = '__seeded'").get()) {
      if (!db.prepare('SELECT COUNT(*) AS n FROM services').get().n) {
        db.prepare("INSERT INTO services (name, description, unit, unit_price, is_package) VALUES ('Perkhidmatan Gamelan (6 Pemain)', NULL, 'pakej', 180000, 1)").run();
      }
      insert.run('__seeded', 'true');
    }
  })();
}

/** Settings visible to clients (keys starting with "__" are private). */
export function getSettings(db) {
  const out = {};
  for (const row of db.prepare("SELECT key, value FROM settings WHERE key NOT LIKE '\\_\\_%' ESCAPE '\\'").all()) {
    try {
      out[row.key] = JSON.parse(row.value);
    } catch {
      out[row.key] = row.value;
    }
  }
  return { ...DEFAULT_SETTINGS, ...out };
}

export function getSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return DEFAULT_SETTINGS[key];
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

export function setSetting(db, key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    key,
    JSON.stringify(value),
  );
}

/** Tables in dependency order (parents first) - used by backup / restore. */
export const TABLES = [
  'users',
  'settings',
  'counters',
  'customers',
  'services',
  'bookings',
  'quotations',
  'quotation_items',
  'invoices',
  'invoice_items',
  'payments',
  'activity_log',
];
