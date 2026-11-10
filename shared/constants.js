// Canonical status/method codes. Stored in the database in English and
// translated for display on the client (see client/src/lib/i18n.jsx).

export const BOOKING_STATUSES = [
  'New Enquiry',
  'Pending Quotation',
  'Quotation Sent',
  'Awaiting Confirmation',
  'Confirmed',
  'Deposit Paid',
  'Fully Paid',
  'Completed',
  'Cancelled',
];

export const QUOTATION_STATUSES = ['Draft', 'Sent', 'Viewed', 'Approved', 'Rejected', 'Expired'];

export const INVOICE_STATUSES = ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'];

export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'DuitNow', 'QR Payment', 'Other'];

export const PAYMENT_TYPES = ['Deposit', 'Partial', 'Balance', 'Full'];

export const DOC_TYPES = ['customer', 'booking', 'quotation', 'invoice', 'receipt'];

export const DEFAULT_PREFIXES = {
  customer: 'CUS',
  booking: 'BK',
  quotation: 'QT',
  invoice: 'INV',
  receipt: 'RC',
};

/** Rank used to auto-advance booking status (never moves backwards). */
export function bookingRank(status) {
  if (status === 'Cancelled') return -1;
  return BOOKING_STATUSES.indexOf(status);
}
