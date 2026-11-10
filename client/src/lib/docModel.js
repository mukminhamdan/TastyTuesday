// Builds a renderer-neutral model of a quotation / invoice / receipt.
// The same model drives the on-screen HTML preview and the PDF generator,
// so what the user sees is exactly what the customer receives.
import { translate } from './i18n.jsx';
import { fmtRM, fmtDate, fmtTimeRange } from './format.js';

const tr = (lang) => (k, v) => translate(lang, k, v);

export function businessBlock(s) {
  const contact = [s.phone && `Tel: ${s.phone}`, s.email].filter(Boolean).join('  |  ');
  const web = [s.website, s.social_media].filter(Boolean).join('  |  ');
  return {
    name: s.business_name || '',
    regNo: s.registration_no ? `(${s.registration_no})` : '',
    lines: [...String(s.address || '').split('\n'), contact, web].map((x) => x.trim()).filter(Boolean),
    logo: s.logo || '',
  };
}

function customerLines(d) {
  return [d.customer_company && d.customer_company !== d.customer_name ? d.customer_company : null, d.customer_contact ? `u.p. ${d.customer_contact}` : null, ...String(d.customer_address || '').split('\n'), d.customer_phone ? `Tel: ${d.customer_phone}` : null, d.customer_email]
    .map((x) => (x || '').trim())
    .filter(Boolean);
}

function bankRows(s, t) {
  if (!s.bank_name && !s.bank_account_no) return null;
  return [
    [t('doc.bankName'), s.bank_name || '-'],
    [t('doc.accountNo'), s.bank_account_no || '-'],
    [t('doc.accountName'), s.bank_account_name || s.business_name || '-'],
  ];
}

function itemRows(items) {
  return (items || []).map((it, i) => ({
    no: i + 1,
    description: it.description,
    details: it.details || '',
    qty: `${Number(it.quantity).toLocaleString('en-MY', { maximumFractionDigits: 2 })}${it.unit ? ' ' + it.unit : ''}`,
    unitPrice: fmtRM(it.unit_price).replace('RM ', ''),
    amount: fmtRM(it.amount).replace('RM ', ''),
  }));
}

function totalsRows(d, t) {
  const rows = [[t('doc.subtotal'), fmtRM(d.subtotal)]];
  if (d.discount_amount > 0) {
    rows.push([d.discount_type === 'percent' ? `${t('doc.discount')} (${Number(d.discount_value)}%)` : t('doc.discount'), '-' + fmtRM(d.discount_amount)]);
  }
  if (d.additional_charges > 0) rows.push([d.additional_label || t('doc.additionalCharges'), fmtRM(d.additional_charges)]);
  if (d.tax_enabled) rows.push([`${d.tax_label || t('doc.tax')} (${Number(d.tax_rate)}%)`, fmtRM(d.tax_amount)]);
  return rows;
}

function eventRows(d, t) {
  const rows = [];
  if (d.event_name) rows.push([t('doc.event'), d.event_name]);
  if (d.event_date) rows.push([t('doc.eventDate'), fmtDate(d.event_date) + (d.start_time ? `, ${fmtTimeRange(d.start_time, d.end_time)}` : '')]);
  if (d.event_venue) rows.push([t('doc.venue'), d.event_venue]);
  if (d.pax) rows.push([t('doc.pax'), String(d.pax)]);
  return rows.length ? rows : null;
}

export function buildDocModel(kind, d, s, lang = 'ms') {
  const t = tr(lang);
  const base = {
    kind,
    lang,
    business: businessBlock(s),
    template: s.doc_template || 'modern',
    accent: s.accent_color || '#1e40af',
    footer: s.doc_footer || '',
  };

  if (kind === 'quotation') {
    return {
      ...base,
      title: t('doc.quotationTitle'),
      number: d.quotation_no,
      stamp: d.status === 'Approved' ? t('st.Approved') : d.status === 'Rejected' || d.status === 'Expired' ? t(`st.${d.status}`) : null,
      meta: [
        [t('doc.quotationNo'), d.quotation_no],
        [t('doc.date'), fmtDate(d.quotation_date)],
        [t('doc.validUntil'), fmtDate(d.valid_until)],
        ...(d.booking_no ? [[t('doc.bookingRef'), d.booking_no]] : []),
        ...(d.customer_no ? [[t('doc.customerId'), d.customer_no]] : []),
      ],
      billTo: { title: t('doc.to'), name: d.customer_name, lines: customerLines(d) },
      event: eventRows(d, t),
      items: itemRows(d.items),
      totals: totalsRows(d, t),
      grandTotal: [t('doc.grandTotal'), fmtRM(d.total)],
      sections: [
        d.notes && { title: t('doc.notes'), text: d.notes },
        d.payment_terms && { title: t('doc.paymentTerms'), text: d.payment_terms },
        d.terms && { title: t('doc.terms'), text: d.terms },
      ].filter(Boolean),
      bank: bankRows(s, t),
      acceptance: true,
    };
  }

  if (kind === 'invoice') {
    const totals = totalsRows(d, t);
    const after = [];
    if (d.deposit_required > 0 && d.amount_paid < d.deposit_required && d.status !== 'Paid') {
      after.push([`${t('doc.depositRequired')} (${Number(d.deposit_percent)}%)`, fmtRM(d.deposit_required)]);
    }
    if (d.amount_paid > 0) {
      if (d.deposit_paid > 0) after.push([t('doc.depositPaid'), '-' + fmtRM(d.deposit_paid)]);
      if (d.amount_paid - d.deposit_paid > 0) after.push([t('doc.otherPayments'), '-' + fmtRM(d.amount_paid - d.deposit_paid)]);
    }
    return {
      ...base,
      title: t('doc.invoiceTitle'),
      number: d.invoice_no,
      stamp: d.status === 'Paid' ? t('doc.paidStamp') : d.status === 'Cancelled' ? t('st.Cancelled') : null,
      stampTone: d.status === 'Paid' ? 'green' : 'red',
      meta: [
        [t('doc.invoiceNo'), d.invoice_no],
        [t('doc.date'), fmtDate(d.invoice_date)],
        [t('doc.dueDate'), fmtDate(d.due_date)],
        ...(d.booking_no ? [[t('doc.bookingRef'), d.booking_no]] : []),
        ...(d.quotation_no ? [[t('doc.quotationRef'), d.quotation_no]] : []),
        ...(d.customer_no ? [[t('doc.customerId'), d.customer_no]] : []),
      ],
      billTo: { title: t('doc.billTo'), name: d.customer_name, lines: customerLines(d) },
      event: eventRows(d, t),
      items: itemRows(d.items),
      totals,
      grandTotal: [t('doc.totalAmount'), fmtRM(d.total)],
      afterTotals: after,
      balance: [t('doc.balanceDue'), fmtRM(d.balance)],
      payments: (d.payments || [])
        .filter((p) => p.status === 'Valid')
        .map((p) => [fmtDate(p.payment_date), p.receipt_no, t(`pm.${p.method}`), fmtRM(p.amount)]),
      sections: [
        d.notes && { title: t('doc.notes'), text: d.notes },
        d.payment_instructions && { title: t('doc.paymentInstructions'), text: d.payment_instructions },
        d.terms && { title: t('doc.terms'), text: d.terms },
      ].filter(Boolean),
      bank: bankRows(s, t),
    };
  }

  // receipt
  return {
    ...base,
    title: t('doc.receiptTitle'),
    number: d.receipt_no,
    stamp: d.status === 'Void' ? t('doc.voidStamp') : null,
    stampTone: 'red',
    meta: [
      [t('doc.receiptNo'), d.receipt_no],
      [t('doc.date'), fmtDate(d.payment_date)],
      [t('doc.invoiceRef'), d.invoice_no],
      ...(d.booking_no ? [[t('doc.bookingRef'), d.booking_no]] : []),
    ],
    billTo: { title: t('doc.receivedFrom'), name: d.customer_name, lines: customerLines(d) },
    amount: fmtRM(d.amount),
    amountWords: amountInWords(d.amount, lang),
    details: [
      [t('doc.paymentFor'), d.description || '-'],
      [t('doc.paymentType'), t(`pt.${d.payment_type}`)],
      [t('doc.paymentMethod'), t(`pm.${d.method}`)],
      [t('doc.paymentRef'), d.reference || '-'],
      ...(d.event_name ? [[t('doc.event'), `${d.event_name}${d.event_date ? ' (' + fmtDate(d.event_date) + ')' : ''}`]] : []),
    ],
    summary: [
      [t('doc.invoiceTotal'), fmtRM(d.invoice_total)],
      [t('doc.thisPayment'), fmtRM(d.amount)],
      [t('doc.paidToDate'), fmtRM(d.paid_to_date)],
      [t('doc.remainingBalance'), fmtRM(d.balance_after)],
    ],
    receivedBy: d.received_by || '',
    voidReason: d.status === 'Void' ? d.void_reason : null,
    sections: [],
  };
}

// ---------------------------------------------------------------------------
// Amount in words (Bahasa Melayu / English) for receipts
// ---------------------------------------------------------------------------
const MS = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'lapan', 'sembilan'];
function msBelowThousand(n) {
  const parts = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(h === 1 ? 'seratus' : `${MS[h]} ratus`);
  if (rest >= 20) {
    parts.push(`${MS[Math.floor(rest / 10)]} puluh`);
    if (rest % 10) parts.push(MS[rest % 10]);
  } else if (rest >= 11) {
    parts.push(rest === 11 ? 'sebelas' : `${MS[rest - 10]} belas`);
  } else if (rest === 10) parts.push('sepuluh');
  else if (rest) parts.push(MS[rest]);
  return parts.join(' ');
}
function msWords(n) {
  if (n === 0) return 'kosong';
  const scales = [
    [1e9, 'bilion', 'sebilion'],
    [1e6, 'juta', 'sejuta'],
    [1e3, 'ribu', 'seribu'],
  ];
  const parts = [];
  for (const [v, word, single] of scales) {
    const q = Math.floor(n / v);
    if (q) {
      parts.push(q === 1 ? single : `${msBelowThousand(q)} ${word}`);
      n %= v;
    }
  }
  if (n) parts.push(msBelowThousand(n));
  return parts.join(' ');
}

const EN_ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function enBelowThousand(n) {
  const parts = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(`${EN_ONES[h]} hundred`);
  if (rest) {
    if (h) parts.push('and');
    if (rest < 20) parts.push(EN_ONES[rest]);
    else parts.push(EN_TENS[Math.floor(rest / 10)] + (rest % 10 ? '-' + EN_ONES[rest % 10] : ''));
  }
  return parts.join(' ');
}
function enWords(n) {
  if (n === 0) return 'zero';
  const parts = [];
  for (const [v, word] of [
    [1e9, 'billion'],
    [1e6, 'million'],
    [1e3, 'thousand'],
  ]) {
    const q = Math.floor(n / v);
    if (q) {
      parts.push(`${enBelowThousand(q)} ${word}`);
      n %= v;
    }
  }
  if (n) parts.push(enBelowThousand(n));
  return parts.join(' ');
}

export function amountInWords(sen, lang = 'ms') {
  const total = Math.round(Number(sen) || 0);
  const rm = Math.floor(total / 100);
  const cents = total % 100;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  if (lang === 'en') {
    return `Ringgit Malaysia ${cap(enWords(rm))}${cents ? ` and ${enWords(cents)} sen` : ''} only`;
  }
  return `Ringgit Malaysia ${cap(msWords(rm))}${cents ? ` dan ${msWords(cents)} sen` : ''} sahaja`;
}
