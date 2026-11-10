export function logActivity(db, user, { entity_type, entity_id, ref_no, customer_id, action, description }) {
  db.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, ref_no, customer_id, action, description, user_id, user_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(entity_type, entity_id ?? null, ref_no ?? null, customer_id ?? null, action, description ?? null, user?.id ?? null, user?.name ?? null);
}

const BM = {
  'New Enquiry': 'Pertanyaan Baharu', 'Pending Quotation': 'Menunggu Sebut Harga', 'Quotation Sent': 'Sebut Harga Dihantar',
  'Awaiting Confirmation': 'Menunggu Pengesahan', Confirmed: 'Disahkan', 'Deposit Paid': 'Deposit Dibayar', 'Fully Paid': 'Dibayar Penuh',
  Completed: 'Selesai', Cancelled: 'Dibatalkan', Draft: 'Draf', Sent: 'Dihantar', Viewed: 'Dilihat', Approved: 'Diluluskan',
  Rejected: 'Ditolak', Expired: 'Tamat Tempoh', 'Bank Transfer': 'Pindahan Bank', Cash: 'Tunai', 'QR Payment': 'Bayaran QR', Other: 'Lain-lain',
};
/** Malay label for a status / payment method code (activity log is written in Bahasa Melayu). */
export const bm = (code) => BM[code] || code;

const nf = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Format sen as "RM 1,234.50". */
export const rm = (sen) => `RM ${nf.format((Number(sen) || 0) / 100)}`;
