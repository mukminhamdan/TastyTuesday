# Architecture & Database Design

## 1. Technology stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Node.js 20+** | One language (JavaScript) across server, client and shared business logic. |
| API server | **Express 5** | Small, well-known, easy to host anywhere. |
| Database | **SQLite** via **better-sqlite3** (WAL mode, foreign keys ON) | A real relational database in a single file: ACID transactions, foreign keys and zero administration. It suits a small or medium business with a few concurrent users, and backups are just a file copy. |
| Auth | **bcrypt** password hashes + **JWT in an httpOnly, SameSite cookie** | No tokens are exposed to JavaScript. A custom-header check blocks CSRF, and logins are rate-limited. |
| UI | **React 19 + React Router 7 + Tailwind CSS 4**, built with **Vite** | Fast, responsive single-page app that works on desktop, tablet and mobile. |
| Charts | **Chart.js** | Light, accessible canvas charts. |
| PDF | **jsPDF + jspdf-autotable** (loaded on demand) | Vector PDFs with selectable text, generated in the browser. The server needs no headless browser. |
| Excel | **ExcelJS** (loaded on demand) | Real `.xlsx` files with currency formats and `SUM` formulas. |

Money is stored and calculated as **integer sen** (RM 1.00 = 100) everywhere, so there are no floating-point
rounding errors. The same calculation module (`shared/calc.js`) drives the live totals in the browser
and the authoritative totals on the server.

## 2. Application architecture

```
┌──────────────────────────── Browser (React SPA) ────────────────────────────┐
│ Pages: Dashboard · Customers · Bookings · Calendar · Quotations · Invoices │
│        Receipts · Payments · Reports · Settings · Public document view      │
│ lib/docModel.js ──► DocumentPreview (HTML)   ──┐ same model, same layout     │
│                 └─► pdf.js (jsPDF)  ◄──────────┘                             │
│ lib/i18n + dict.js (Bahasa Melayu / English)   shared/calc.js (totals)       │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ JSON over HTTPS (/api/*), session cookie
┌───────────────────────────────▼─────────────────────────────────────────────┐
│ Express server (server/)                                                    │
│  lib/auth.js       sessions, roles (admin / staff), CSRF guard, rate limit  │
│  lib/numbering.js  BK/QT/INV/RC-YYYY-NNNN sequential numbers                │
│  lib/finance.js    totals, invoice balance/status, booking status sync,     │
│                    overdue / expiry sweeps                                  │
│  routes/*          customers, bookings, quotations, invoices, payments,     │
│                    dashboard, reports, settings, services, users, backup,   │
│                    public (token links for customers)                      │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ synchronous, transactional
                     ┌──────────▼──────────┐   daily snapshot ──► data/backups/
                     │ SQLite  data/bms.sqlite │
                     └─────────────────────┘
```

Every multi-step operation runs inside a single database transaction: number allocation, document
creation, line items, status propagation and the activity log. Either all of it is saved or none of it is.

## 3. Database design

```
users ─┐ (created_by)
       │
customers 1───* bookings 1───* quotations 1───* quotation_items
    │              │   └──────────────* invoices 1───* invoice_items
    │              │                    │   ▲
    │              │                    │   └── quotation_id (approved quotation → invoice)
    │              └──────────────────* │
    └──────────────────────────────────* payments (= receipts, 1 payment ⇒ 1 receipt_no)
services (catalogue) ◄── service_id on line items
counters (doc_type, year → last_number)   settings (key → JSON)   activity_log
```

| Table | Key columns | Relationships / rules |
|---|---|---|
| `customers` | `customer_no` (CUS-0001), name, company, contact_person, phone, email, billing_address, event_location, category, notes | Cannot be deleted while it has bookings, quotations or invoices (`ON DELETE RESTRICT`). |
| `bookings` | `booking_no`, event_name/type, event_date, start/end time, venue, event_address, services (JSON list), package, pax, special_requirements, internal_notes, status, cancel_reason | → customer. Cannot be deleted once invoiced (cancel instead). |
| `quotations` | `quotation_no`, quotation_date, valid_until, event snapshot, discount_type (`fixed`/`percent`), discount_value, additional_label/charges, tax_enabled/rate/label, subtotal, discount_amount, tax_amount, total, terms, payment_terms, status, share_token, sent/viewed/approved/rejected timestamps | → customer, → booking (optional). Locked once approved. |
| `quotation_items` / `invoice_items` | description, details, quantity, unit, unit_price, amount, sort_order, service_id | Cascade-deleted with their document. |
| `invoices` | `invoice_no`, invoice_date, due_date, pricing fields as above, deposit_percent, deposit_required, amount_paid, balance, payment_instructions, status, cancel_reason | → customer, → booking, → quotation. `amount_paid` / `balance` / `status` are recalculated from payments. |
| `payments` | `receipt_no`, payment_date, amount, method, reference, description, payment_type (Deposit/Partial/Balance/Full), balance_after, received_by, status (Valid/Void), void_reason | → invoice, → customer, → booking. Never deleted, only voided, so the receipt trail is permanent. |
| `services` | name, description, unit, unit_price, is_package, active | Catalogue used by booking forms and document line items. |
| `counters` | (doc_type, year) → last_number | Only ever incremented, so numbers are never reused. |
| `settings` | key → JSON value | Business info, logo, bank, templates, terms, prefixes, lists. |
| `activity_log` | entity, ref_no, customer_id, action, description, user | Drives "recent activity" on the dashboard and customer profile. |
| `users` | name, email, password_hash, role, active | `admin` or `staff`. |

## 4. Status automation

| Event | Quotation | Booking | Invoice |
|---|---|---|---|
| Quotation created for booking | Draft | New Enquiry → **Pending Quotation** | |
| Quotation marked sent / shared | **Sent** | → **Quotation Sent** | |
| Customer opens share link | **Viewed** | → **Awaiting Confirmation** | |
| Quotation approved | **Approved** (locked) | → **Confirmed** | |
| Past valid-until date | **Expired** | | |
| Invoice issued | | → Confirmed (if earlier) | Draft / **Sent** |
| First payment (balance > 0) | | → **Deposit Paid** | **Partially Paid** (receipt type *Deposit*) |
| Payment clears balance | | → **Fully Paid** | **Paid** (receipt type *Balance* or *Full*) |
| Past due date with balance | | | **Overdue** |
| Payment voided | | recalculated (e.g. back to Confirmed) | recalculated |
| Manual | | **Completed** / **Cancelled** (with reason) | **Cancelled** (only with no valid payments) |

Booking status only moves forward automatically and never overrides *Completed* or *Cancelled*.

## 5. Document numbering

`PREFIX-YYYY-NNNN`, for example BK-2026-0001, QT-2026-0001, INV-2026-0001, RC-2026-0001; customers use CUS-0001.
The year comes from the document date and each year starts again at 0001. Prefixes are configurable in
*Settings → Document numbering*. The year can be switched off for one continuous sequence, prefixes
(other than the customer prefix) may be left empty for plain numbers such as `0211`, and the *next number*
can be moved forward to continue an existing manual sequence. It can never be moved backwards. Counters are incremented inside the creating transaction and also checked
against existing numbers, so numbers are unique, sequential and never reused, even after deletion,
cancellation, voiding or a prefix change.
