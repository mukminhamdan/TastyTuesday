// Browser walkthrough of the complete workflow against a running server with an EMPTY database.
//   DATA_DIR=/tmp/bms-e2e PORT=3100 npm start   (in another terminal)
//   BASE_URL=http://localhost:3100 node tests/e2e-ui.mjs
// Screenshots are written to SHOTS_DIR (default ./test-results).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Playwright is resolved with require() so a globally installed copy (NODE_PATH) also works.
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const SHOTS = process.env.SHOTS_DIR || 'test-results';
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
const step = (s) => console.log('•', s);
const field = (label) => page.locator('div', { has: page.locator(`label:text-is("${label}")`) }).last();
const confirmDialog = async () => page.locator('[role=alertdialog] button').last().click();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
const plusDays = (n) => {
  const d = new Date(today + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  const iso = d.toISOString().slice(0, 10);
  return `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
};

try {
  step('First-run setup');
  await page.goto(BASE);
  await page.getByText('Persediaan kali pertama').waitFor();
  await shot('01-setup');
  await field('Nama perniagaan').locator('input').fill('Tasty Tuesday Enterprise');
  await field('Nama').locator('input').fill('Aminah Admin');
  await field('E-mel').locator('input').fill('admin@tastytuesday.my');
  await field('Kata laluan').locator('input').fill('rahsia123');
  await field('Sahkan kata laluan').locator('input').fill('rahsia123');
  await page.getByRole('button', { name: 'Cipta akaun & mula' }).click();
  await page.getByRole('heading', { name: 'Papan Pemuka' }).waitFor();

  step('Settings: business details, bank, services');
  await page.goto(BASE + '/settings');
  await field('No. pendaftaran (SSM)').locator('input').fill('202401012345 (1234567-A)');
  await field('Alamat perniagaan').locator('textarea').fill('No. 8, Jalan Seni 3/2\nSeksyen 3, 40000 Shah Alam, Selangor');
  await field('No. telefon').locator('input').fill('03-5511 2233');
  await field('E-mel').locator('input').fill('hello@tastytuesday.my');
  await field('Nama bank').locator('input').fill('Maybank');
  await field('No. akaun').locator('input').fill('5621 0012 3456');
  await field('Nama pemegang akaun').locator('input').fill('Tasty Tuesday Enterprise');
  await page.getByRole('button', { name: 'Simpan tetapan' }).click();
  await page.getByText('Tetapan disimpan').waitFor();
  await page.getByRole('button', { name: 'Katalog servis' }).click();
  for (const [name, price, pkg] of [
    ['Pakej Persembahan Gamelan', '2500', true],
    ['Sistem PA & Mikrofon', '500', false],
    ['Pengacara Majlis', '800', false],
  ]) {
    await page.getByRole('button', { name: 'Tambah servis' }).first().click();
    const dlg = page.getByRole('dialog');
    await dlg.locator('div', { has: page.locator('label:text-is("Servis")') }).last().locator('input').fill(name);
    await dlg.locator('input[inputmode=decimal]').fill(price);
    if (pkg) await dlg.getByLabel('Ini adalah pakej').check();
    await dlg.getByRole('button', { name: 'Simpan' }).click();
    await page.getByRole('cell', { name: new RegExp(name) }).waitFor();
  }
  await shot('02-settings-services');

  step('1. Register a new customer');
  await page.goto(BASE + '/customers');
  await page.getByRole('button', { name: 'Pelanggan baharu' }).first().click();
  let dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Simpan' }).click();
  await dlg.getByText('Wajib diisi').waitFor(); // validation
  await dlg.locator('div', { has: page.locator('label:has-text("Nama pelanggan")') }).last().locator('input').fill('Majlis Bandaraya Shah Alam');
  await dlg.locator('div', { has: page.locator('label:text-is("Syarikat / Organisasi")') }).last().locator('input').fill('MBSA');
  await dlg.locator('div', { has: page.locator('label:text-is("Orang untuk dihubungi")') }).last().locator('input').fill('Puan Rohana');
  await dlg.locator('div', { has: page.locator('label:text-is("No. telefon")') }).last().locator('input').fill('012-388 4455');
  await dlg.locator('div', { has: page.locator('label:text-is("E-mel")') }).last().locator('input').fill('rohana@mbsa.gov.my');
  await dlg.locator('select').selectOption('Kerajaan');
  await dlg.locator('div', { has: page.locator('label:text-is("Alamat bil")') }).last().locator('textarea').fill('Wisma MBSA, Persiaran Perbandaran\n40000 Shah Alam, Selangor');
  await dlg.locator('div', { has: page.locator('label:text-is("Lokasi acara")') }).last().locator('textarea').fill('Dataran Kemerdekaan Shah Alam');
  await dlg.getByRole('button', { name: 'Simpan' }).click();
  await page.getByText('Pelanggan CUS-0001 didaftarkan').waitFor();
  await page.getByRole('cell', { name: 'CUS-0001' }).waitFor();
  await shot('03-customers');

  step('2. Create a booking');
  await page.goto(BASE + '/bookings/new');
  await page.getByRole('button', { name: 'Pilih pelanggan...' }).click();
  await page.getByRole('button', { name: /Majlis Bandaraya Shah Alam/ }).click();
  await field('Nama acara').locator('input').fill('Sambutan Hari Kebangsaan MBSA');
  await page.locator('select').first().selectOption('Festival / Karnival');
  await field('Bilangan persembahan / peserta').locator('input').fill('15');
  await field('Tarikh acara').locator('input').first().fill(plusDays(20));
  await page.locator('input[type=time]').nth(0).fill('20:00');
  await page.locator('input[type=time]').nth(1).fill('23:00');
  await field('Tempat').locator('input').fill('Dataran Kemerdekaan');
  await field('Pakej dipilih').locator('input').fill('Pakej Persembahan Gamelan');
  await page.getByRole('button', { name: 'Sistem PA & Mikrofon' }).click();
  await page.getByRole('button', { name: 'Pengacara Majlis' }).click();
  await field('Keperluan khas').locator('textarea').fill('Pentas 8m x 6m disediakan oleh pelanggan');
  await page.getByRole('button', { name: 'Cipta tempahan' }).click();
  await page.getByText(/Tempahan BK-\d{4}-0001 dicipta/).waitFor();
  const bookingUrl = page.url();
  await page.getByText('Pertanyaan Baharu').first().waitFor();
  await shot('04-booking-detail');

  step('3. Generate quotation from booking');
  await page.getByRole('button', { name: 'Jana sebut harga' }).click();
  await page.waitForURL(/\/quotations\/\d+\/edit/);
  await page.getByRole('button', { name: 'Tambah item' }).click();
  const descs = page.getByPlaceholder('Keterangan servis');
  await descs.last().fill('Penari tambahan');
  const qtys = page.locator('input.num.text-right[inputmode=decimal]:not(.pl-10)');
  await qtys.last().fill('4');
  await page.locator('input.pl-10').nth(3).fill('250'); // unit price of 4th item (RM)
  await page.locator('input.pl-10').nth(3).blur();
  await page.getByLabel('Kenakan cukai (SST)').check();
  await page.getByText('Jumlah besar').locator('..').getByText('RM 5,184.00').waitFor(); // 2500+500+800+4x250 = 4800 + SST 8% 384
  await shot('05-quotation-form');
  await page.getByRole('button', { name: 'Simpan & tanda dihantar' }).click();
  await page.waitForURL(/\/quotations\/\d+$/);
  await page.getByText('Dihantar').first().waitFor();
  await shot('06-quotation-detail');

  step('4. Approve quotation');
  await page.getByRole('button', { name: 'Pelanggan luluskan' }).click();
  await confirmDialog();
  await page.getByText('Status sebut harga: Diluluskan').waitFor();

  step('5. Convert quotation into invoice');
  await page.getByRole('button', { name: 'Tukar kepada invois' }).click();
  await page.waitForURL(/\/invoices\/\d+$/);
  await page.getByText(/INV-\d{4}-0001/).first().waitFor();
  await page.getByRole('button', { name: 'Tanda sebagai dihantar' }).click();
  await page.getByText('Status invois: Dihantar').waitFor();
  const invoiceUrl = page.url();
  await shot('07-invoice-detail');

  step('PDF download of invoice');
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Muat turun PDF' }).click()]);
  const pdfPath = path.join(SHOTS, pdf.suggestedFilename());
  await pdf.saveAs(pdfPath);
  assert.ok(fs.statSync(pdfPath).size > 5000, 'invoice PDF generated');

  step('6+7. Record 50% deposit -> receipt');
  await page.getByRole('button', { name: 'Rekod bayaran' }).first().click();
  dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: /Deposit 50%/ }).click();
  await dlg.locator('select').first().selectOption('Bank Transfer');
  await dlg.locator('div', { has: page.locator('label:text-is("Rujukan bayaran")') }).last().locator('input').fill('MBB-778812');
  await shot('08-record-deposit');
  await dlg.getByRole('button', { name: 'Simpan & jana resit' }).click();
  await page.getByText('Resit telah dijana').waitFor();
  await confirmDialog();
  await page.waitForURL(/\/receipts\/\d+$/);
  await page.getByText(/RC-\d{4}-0001/).first().waitFor();
  await page.getByText('Bayaran Deposit').or(page.getByText('Deposit').first()).first().waitFor();
  await shot('09-deposit-receipt');
  const [rpdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Muat turun PDF' }).click()]);
  await rpdf.saveAs(path.join(SHOTS, rpdf.suggestedFilename()));

  step('Booking is Deposit Paid');
  await page.goto(bookingUrl);
  await page.getByText('Deposit Dibayar').first().waitFor();

  step('8+9. Record remaining 50% -> final receipt');
  await page.goto(invoiceUrl);
  await page.getByText('Dibayar Separa').first().waitFor();
  await page.getByRole('button', { name: 'Rekod bayaran' }).first().click();
  dlg = page.getByRole('dialog');
  await dlg.getByRole('button', { name: /Baki penuh/ }).click();
  await dlg.locator('select').first().selectOption('DuitNow');
  await dlg.getByRole('button', { name: 'Simpan & jana resit' }).click();
  await page.getByText('Resit telah dijana').waitFor();
  await confirmDialog();
  await page.waitForURL(/\/receipts\/\d+$/);
  await page.getByText(/RC-\d{4}-0002/).first().waitFor();
  await page.getByText('Bayaran Baki Akhir').first().waitFor();
  await shot('10-final-receipt');

  step('10. Invoice is PAID');
  await page.goto(invoiceUrl);
  await page.getByText('Dibayar', { exact: true }).first().waitFor();
  await page.getByText('LUNAS', { exact: false }).first().waitFor();
  await shot('11-invoice-paid');

  step('11. Booking Fully Paid -> Completed');
  await page.goto(bookingUrl);
  await page.getByText('Dibayar Penuh').first().waitFor();
  await page.getByRole('button', { name: 'Tanda selesai' }).click();
  await page.getByText('Status tempahan: Selesai').waitFor();
  await shot('12-booking-completed');

  step('12. Reports & exports');
  await page.goto(BASE + '/reports');
  await page.getByText('Kadar kutipan').waitFor();
  await page.getByText('100%').first().waitFor();
  const [xlsx] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Excel' }).click()]);
  await xlsx.saveAs(path.join(SHOTS, xlsx.suggestedFilename()));
  const [rep] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PDF' }).click()]);
  await rep.saveAs(path.join(SHOTS, rep.suggestedFilename()));
  await shot('13-report-revenue');
  for (const name of ['Tempahan Bulanan', 'Pelanggan', 'Kutipan Bayaran', 'Prestasi Servis', 'Invois Tertunggak', 'Tempahan Dibatalkan', 'Tempahan Tahunan']) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.locator('h2', { hasText: name }).waitFor();
    await page.getByText('Butiran (').waitFor();
  }

  step('Dashboard, calendar, payments');
  await page.goto(BASE + '/');
  await page.getByText('Hasil Bulanan').waitFor();
  await page.waitForTimeout(600);
  await shot('14-dashboard');
  await page.goto(BASE + '/calendar');
  await page.getByText('Sambutan Hari Kebangsaan MBSA').first().waitFor({ state: 'attached' });
  await shot('15-calendar');
  await page.goto(BASE + '/payments');
  await page.getByText('Jumlah Dikutip').waitFor();
  await shot('16-payments');

  step('English toggle');
  await page.getByRole('button', { name: 'EN' }).click();
  await page.getByRole('heading', { name: 'Payments' }).waitFor();
  await page.goto(invoiceUrl);
  await page.getByText('INVOICE').first().waitFor();
  await shot('17-invoice-english');
  await page.getByRole('button', { name: 'BM' }).click();

  step('Mobile layout');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/');
  await page.getByText('Hasil Bulanan').waitFor();
  await page.waitForTimeout(500);
  await shot('18-mobile-dashboard');
  await page.getByRole('button', { name: 'menu' }).click();
  await shot('19-mobile-menu');
  await page.getByRole('link', { name: 'Invois' }).click();
  await page.goto(invoiceUrl);
  await page.waitForTimeout(400);
  await shot('20-mobile-invoice');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false, 'no horizontal page scroll on mobile');

  const real = errors.filter((e) => !/favicon|Failed to load resource: the server responded with a status of 40[49]/.test(e));
  if (real.length) {
    console.log('Console errors:\n' + real.join('\n'));
    process.exitCode = 1;
  } else console.log('\nAll UI steps passed with no console errors.');
} catch (e) {
  await shot('zz-failure').catch(() => {});
  console.error('FAILED:', e.message);
  if (errors.length) console.error('Console errors:\n' + errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
