# Tasty Tuesday – Business Management System

A complete, bilingual (**Bahasa Melayu** / English) business management web application for Malaysian
event and service businesses. It covers the whole cycle, **customer enquiry → booking → quotation
(sebut harga) → invoice → deposit → receipt → balance → final receipt → completed**, with no duplicate
data entry.

- Currency **RM**, dates **DD/MM/YYYY**, business timezone **Asia/Kuala_Lumpur**, optional **SST**
- Responsive on desktop, tablet and mobile
- Real database storage (SQLite), authentication with admin/staff roles, backup & restore

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the architecture, database design, relationships,
status automation and numbering rules.

## Cara mula (Windows / Mac), tanpa arahan

1. Pasang **Node.js** versi LTS dari https://nodejs.org (sekali sahaja).
2. Muat turun sistem ini (fail ZIP) dan ekstrak (extract) ke mana-mana folder, contohnya `Documents\SistemGitaGangsa`.
3. Klik dua kali:
   - **Windows:** `start-windows.bat`
   - **Mac:** `start-mac.command` (kali pertama: klik kanan → *Open*)
4. Pelayar akan dibuka di **http://localhost:3000**. Cipta akaun pentadbir pada skrin pertama.

Kali pertama mengambil masa beberapa minit untuk memasang komponen (perlu internet). Selepas itu, sistem terus dibuka.
Jangan tutup tetingkap hitam semasa menggunakan sistem. Semua data disimpan dalam folder `data` di dalam folder sistem;
salin folder itu (atau gunakan *Tetapan → Sandaran*) untuk membuat sandaran.

## Modules

| Module | Highlights |
|---|---|
| **Dashboard** | Total/upcoming bookings, pending/approved quotations, invoices, outstanding, revenue, payments received; monthly revenue chart; booking calendar; upcoming events; payment reminders (with WhatsApp reminder link); recent activity; filter by date, month or year |
| **Customers** | Auto ID (CUS-0001), full profile with booking/quotation/invoice/payment history and activity, search, category filter, add/edit, delete with confirmation (blocked if documents exist) |
| **Bookings** | All requested fields, 9 statuses with a visual stepper, **overlap detection**, generate quotation / invoice from a booking, deposit & balance tracking, cancel with reason, complete, reopen |
| **Calendar** | Month, week and day views, colour-coded by status, click a day to add a booking |
| **Quotations** | Multiple items from the service catalogue or custom, % or fixed discount, additional charges, optional tax, live totals, draft/sent/viewed/approved/rejected/expired, duplicate, PDF/print/share, **convert to invoice** and **convert to confirmed booking** |
| **Invoices** | From booking or approved quotation, deposit %, partial/full payments, outstanding balance, overdue detection, PDF/print/share, duplicate, cancel |
| **Receipts** | Generated **automatically** for every payment (deposit, partial, balance), amount in words, linked to invoice and booking, PDF/print/share, void with reason |
| **Payments** | Totals invoiced/collected/outstanding/overdue, deposits received, pending payments; outstanding and overdue invoice lists; payment history filtered by customer, date, method and status |
| **Reports** | Monthly & annual bookings, revenue, customers, outstanding (aging), payment collections, service performance, cancelled bookings, each with date range filters, charts, **PDF**, **Excel** and print |
| **Settings** | Business info & logo, bank details, 4 document templates (Modern, Classic, Minimal, and **Traditional (boxed)**, which matches a classic printed Malaysian invoice: bordered table, JUMLAH BESAR, "Yang Benar" signatory) with accent colour, signatory name & position, numbering format (with/without year or prefix) and **next number** to continue an existing paper sequence, validity / payment terms / deposit %, tax defaults, terms & conditions, footer, numbering prefixes, service catalogue, option lists, users, backup & restore |

Documents can be shared by link (customers see a read-only page with a PDF download; opening a quotation
link marks it *Viewed*), WhatsApp, email, or the device's native share sheet.

## Quick start (local)

Requires **Node.js 20 or newer**.

```bash
npm install
npm run build        # builds the web UI into dist/
npm start            # http://localhost:3000
```

On first visit you'll be asked to create the administrator account and business name. Then open
**Tetapan / Settings** to add your address, logo, bank account and service catalogue.

Development mode with hot reload (API on :3000, UI on :5173):

```bash
npm run dev
```

## Configuration

Copy `.env.example` and set these as environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DATA_DIR` | `./data` | Folder for `bms.sqlite` and `backups/`. **Put this on persistent storage.** |
| `JWT_SECRET` | auto-generated | Optional fixed session-signing secret |
| `COOKIE_SECURE` | `false` | Set `true` when served over HTTPS |
| `TRUST_PROXY` | – | Set `1` behind a reverse proxy |
| `APP_TZ` | `Asia/Kuala_Lumpur` | Timezone for "today", overdue and expiry |
| `AUTO_BACKUP` | `true` | Daily database snapshot (newest 14 kept) |

## Deployment

The app is a single Node process plus one database file. Anywhere that runs Node with a persistent disk works.

### Docker (recommended)

```bash
docker compose up -d --build      # data is kept in the "bms-data" volume
```

Put it behind HTTPS (Caddy, Nginx, Cloudflare Tunnel...) and set `COOKIE_SECURE=true`.

### VPS (Ubuntu) with PM2 and Nginx

```bash
git clone <repo> bms && cd bms
npm ci && npm run build
DATA_DIR=/var/lib/bms PORT=3000 COOKIE_SECURE=true TRUST_PROXY=1 pm2 start server/index.js --name bms
pm2 save && pm2 startup
```

Nginx: `location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; }`,
then enable HTTPS with Certbot.

### Render / Railway / Fly.io

- Build command: `npm ci && npm run build` · Start command: `npm start`
- **Attach a persistent disk/volume** and set `DATA_DIR` to its mount path (for example `/data`). Without one,
  data is lost on redeploy.
- Set `COOKIE_SECURE=true` and `TRUST_PROXY=1`.

## Backups

- **Settings → Backup & restore → Download backup file**: full JSON export of all data.
- **Restore** replaces all data from a JSON backup. A safety snapshot of the database is taken first.
- The server also writes a daily SQLite snapshot to `DATA_DIR/backups/`, which you can download from the same screen.
- For off-site safety, copy `DATA_DIR/backups/` to cloud storage regularly (for example with an rclone cron job).

## Roles

- **Administrator**: everything, including settings, users, backup/restore, deleting records and voiding payments.
- **Staff**: create and update customers, bookings, quotations, invoices and payments.

## Testing

```bash
npm test             # API workflow tests (node:test, in-memory database)
```

`tests/workflow.test.js` runs the full acceptance scenario: register a customer → booking (with overlap
detection) → quotation (discount, charges, SST) → share link marks Viewed → approve (booking Confirmed) →
convert to invoice → 50% deposit → deposit receipt → remaining 50% → final receipt → invoice **PAID** →
booking **Fully Paid** → Completed. It also checks voiding, that numbers are never reused, that reports and
dashboard figures reconcile, and backup/restore.

Browser walkthrough of the same workflow through the real UI (needs Playwright and a server with an empty database):

```bash
DATA_DIR=/tmp/bms-e2e PORT=3100 npm start &
BASE_URL=http://localhost:3100 npm run test:ui     # screenshots + PDFs/Excel saved in test-results/
```

## Project structure

```
server/            Express API (db.js schema & migrations, lib/ auth·numbering·finance, routes/)
shared/            calc.js (money maths), constants.js (statuses) – used by server and client
client/src/        React app (pages/, components/, lib/ api·i18n·dict·docModel·pdf·excel·format)
tests/             API workflow test + browser walkthrough
docs/              Architecture & database design
```
