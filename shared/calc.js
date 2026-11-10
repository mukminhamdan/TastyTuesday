// Financial calculations shared by server (authoritative) and client (live preview).
// All money values are INTEGER sen (1 RM = 100 sen) to avoid floating point errors.

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/** Line amount in sen: quantity (up to 2 dp) x unit price (sen), rounded half-up. */
export function lineAmount(quantity, unitPrice) {
  const q100 = Math.round(toNum(quantity) * 100);
  const p = Math.round(toNum(unitPrice));
  return Math.round((q100 * p) / 100);
}

/**
 * Calculate document totals.
 * @param {object} doc
 *  items: [{quantity, unit_price}] unit_price in sen
 *  discount_type: 'percent' | 'fixed'
 *  discount_value: percent (0-100) or sen when fixed
 *  additional_charges: sen
 *  tax_enabled: boolean, tax_rate: percent
 */
export function calcTotals(doc) {
  const items = (doc.items || []).map((it) => ({
    ...it,
    amount: lineAmount(it.quantity, it.unit_price),
  }));
  const subtotal = items.reduce((s, it) => s + it.amount, 0);

  let discount_amount = 0;
  const dv = Math.max(0, toNum(doc.discount_value));
  if (doc.discount_type === 'percent') {
    discount_amount = Math.round((subtotal * Math.min(dv, 100)) / 100);
  } else {
    discount_amount = Math.min(Math.round(dv), subtotal);
  }

  const additional_charges = Math.max(0, Math.round(toNum(doc.additional_charges)));
  const taxable = subtotal - discount_amount + additional_charges;
  const tax_rate = Math.max(0, toNum(doc.tax_rate));
  const tax_amount = doc.tax_enabled ? Math.round((taxable * tax_rate) / 100) : 0;
  const total = taxable + tax_amount;

  return { items, subtotal, discount_amount, additional_charges, taxable, tax_amount, total };
}

/** Convert a RM value typed by a user ("1,234.50") into sen. Returns NaN if invalid. */
export function rmToSen(value) {
  if (typeof value === 'number') return Math.round(value * 100);
  const cleaned = String(value ?? '').replace(/rm/i, '').replace(/[,\s]/g, '');
  if (cleaned === '') return 0;
  if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned)) return NaN;
  return Math.round(parseFloat(cleaned) * 100);
}

export function senToRm(sen) {
  return (Math.round(toNum(sen)) / 100).toFixed(2);
}
