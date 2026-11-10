import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, FileText, FileSpreadsheet, Wallet, CheckCircle2, XCircle, RotateCcw, AlertTriangle, Check } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useAuth, useConfirm, useFetch, useToast } from '../lib/context.jsx';
import { del, post } from '../lib/api.js';
import { PageHeader, Card, StatusBadge, Loading, ErrorState, InfoRow, StatCard } from '../components/ui.jsx';
import { RecordPaymentModal } from '../components/forms.jsx';
import { HistoryTable } from './Customers.jsx';
import { fmtDate, fmtRM, fmtTimeRange, fmtDateTime } from '../lib/format.js';

const FLOW = ['New Enquiry', 'Pending Quotation', 'Quotation Sent', 'Awaiting Confirmation', 'Confirmed', 'Deposit Paid', 'Fully Paid', 'Completed'];

export function StatusStepper({ status }) {
  const { t } = useT();
  const idx = FLOW.indexOf(status);
  if (status === 'Cancelled') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        <XCircle className="h-5 w-5" /> {t('book.cancelledBanner')}
      </div>
    );
  }
  return (
    <ol className="flex overflow-x-auto rounded-lg border border-slate-200 bg-white p-2">
      {FLOW.map((s, i) => (
        <li key={s} className="flex min-w-[96px] flex-1 flex-col items-center gap-1 px-1 text-center">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              i < idx ? 'bg-emerald-500 text-white' : i === idx ? 'bg-brand-700 text-white ring-4 ring-brand-100' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {i < idx ? <Check className="h-4 w-4" /> : i + 1}
          </span>
          <span className={`text-[11px] leading-tight ${i === idx ? 'font-semibold text-brand-800' : i < idx ? 'text-slate-600' : 'text-slate-400'}`}>{t(`st.${s}`)}</span>
        </li>
      ))}
    </ol>
  );
}

export default function BookingDetail() {
  const { id } = useParams();
  const { t } = useT();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const { data: b, loading, error, reload } = useFetch(`/bookings/${id}`);
  const [payFor, setPayFor] = useState(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !b) return <Loading />;

  const act = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  const setStatus = (status, extra = {}) =>
    act(async () => {
      await post(`/bookings/${b.id}/status`, { status, ...extra });
      toast.success(t('book.statusUpdated', { status: t(`st.${status}`) }));
      reload();
    });
  const cancel = async () => {
    const reason = await confirm({ title: t('book.cancelTitle'), message: t('book.cancelMsg'), input: t('book.cancelReason'), danger: true, confirmText: t('book.cancelBooking') });
    if (reason) setStatus('Cancelled', { reason: typeof reason === 'string' ? reason : '' });
  };
  const complete = async () => {
    if (b.summary.balance > 0 && !(await confirm({ title: t('book.completeTitle'), message: t('book.completeUnpaid', { amount: fmtRM(b.summary.balance) }), confirmText: t('book.markCompleted') }))) return;
    setStatus('Completed');
  };
  const makeQuotation = () =>
    act(async () => {
      const q = await post(`/bookings/${b.id}/quotation`);
      toast.success(t('quo.created', { no: q.quotation_no }));
      nav(`/quotations/${q.id}/edit`);
    });
  const makeInvoice = async () => {
    const approved = b.quotations.find((q) => q.status === 'Approved');
    if (b.invoices.some((i) => i.status !== 'Cancelled') && !(await confirm({ title: t('inv.anotherTitle'), message: t('inv.anotherMsg'), confirmText: t('inv.generate') }))) return;
    if (!approved && b.quotations.length && !(await confirm({ title: t('inv.noApprovedTitle'), message: t('inv.noApprovedMsg'), confirmText: t('inv.generate') }))) return;
    act(async () => {
      const inv = await post(`/bookings/${b.id}/invoice`);
      toast.success(t('inv.created', { no: inv.invoice_no }));
      nav(`/invoices/${inv.id}`);
    });
  };
  const remove = async () => {
    if (!(await confirm({ title: t('book.deleteTitle'), message: t('book.deleteMsg', { no: b.booking_no }), danger: true, confirmText: t('common.delete') }))) return;
    act(async () => {
      await del(`/bookings/${b.id}`);
      toast.success(t('common.deleted'));
      nav('/bookings');
    });
  };

  const openInvoice = b.invoices.find((i) => i.balance > 0 && !['Cancelled'].includes(i.status));
  const cancelled = b.status === 'Cancelled';
  const early = ['New Enquiry', 'Pending Quotation', 'Quotation Sent', 'Awaiting Confirmation'].includes(b.status);

  return (
    <div>
      <PageHeader
        back={
          <Link to="/bookings" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" /> {t('nav.bookings')}
          </Link>
        }
        title={b.event_name}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {b.booking_no} · <Link to={`/customers/${b.customer_id}`} className="text-brand-700 hover:underline">{b.customer_name}</Link> <StatusBadge status={b.status} />
          </span>
        }
        actions={
          <>
            {!cancelled && (
              <>
                <button className="btn-secondary" onClick={makeQuotation} disabled={busy}>
                  <FileText className="h-4 w-4" /> {t('book.toQuotation')}
                </button>
                <button className="btn-secondary" onClick={makeInvoice} disabled={busy}>
                  <FileSpreadsheet className="h-4 w-4" /> {t('book.toInvoice')}
                </button>
                {openInvoice && (
                  <button className="btn-success" onClick={() => setPayFor(openInvoice)} disabled={busy}>
                    <Wallet className="h-4 w-4" /> {t('pay.record')}
                  </button>
                )}
                {early && (
                  <button className="btn-primary" onClick={() => setStatus('Confirmed')} disabled={busy}>
                    <CheckCircle2 className="h-4 w-4" /> {t('book.confirm')}
                  </button>
                )}
                {['Confirmed', 'Deposit Paid', 'Fully Paid'].includes(b.status) && (
                  <button className="btn-primary" onClick={complete} disabled={busy}>
                    <CheckCircle2 className="h-4 w-4" /> {t('book.markCompleted')}
                  </button>
                )}
              </>
            )}
            {(cancelled || b.status === 'Completed') && (
              <button className="btn-secondary" onClick={() => setStatus(cancelled ? 'New Enquiry' : 'Confirmed')} disabled={busy}>
                <RotateCcw className="h-4 w-4" /> {t('book.reopen')}
              </button>
            )}
            <Link to={`/bookings/${b.id}/edit`} className="btn-secondary">
              <Pencil className="h-4 w-4" /> {t('common.edit')}
            </Link>
            {!cancelled && (
              <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={cancel} disabled={busy} title={t('book.cancelBooking')}>
                <XCircle className="h-4 w-4" /> <span className="sm:hidden xl:inline">{t('book.cancelBooking')}</span>
              </button>
            )}
            {isAdmin && (
              <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={remove} disabled={busy} title={t('common.delete')}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </>
        }
      />
      <div className="mb-5">
        <StatusStepper status={b.status} />
      </div>
      {b.conflicts.length > 0 && (
        <div className="mb-5 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">{t('book.overlapWarning', { n: b.conflicts.length })}</div>
            {b.conflicts.map((c) => (
              <div key={c.id}>
                <Link className="underline" to={`/bookings/${c.id}`}>
                  {c.booking_no}
                </Link>{' '}
                {c.event_name} · {fmtTimeRange(c.start_time, c.end_time) || t('book.allDay')}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title={t('book.details')}>
            <dl className="grid gap-x-8 sm:grid-cols-2">
              <InfoRow label={t('book.eventType')}>{b.event_type}</InfoRow>
              <InfoRow label={t('book.date')}>{fmtDate(b.event_date)}</InfoRow>
              <InfoRow label={t('book.time')}>{fmtTimeRange(b.start_time, b.end_time)}</InfoRow>
              <InfoRow label={t('book.pax')}>{b.pax}</InfoRow>
              <InfoRow label={t('book.venue')}>{b.venue}</InfoRow>
              <InfoRow label={t('book.address')}>
                <span className="whitespace-pre-line">{b.event_address}</span>
              </InfoRow>
              <InfoRow label={t('book.package')}>{b.package}</InfoRow>
              <InfoRow label={t('book.services')}>{b.services.length ? b.services.join(', ') : '-'}</InfoRow>
              <InfoRow label={t('cust.phone')}>{b.customer_phone}</InfoRow>
              <InfoRow label={t('cust.email')}>{b.customer_email}</InfoRow>
            </dl>
            {(b.special_requirements || b.internal_notes || b.cancel_reason) && (
              <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                {b.special_requirements && (
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-500">{t('book.specialRequirements')}</div>
                    <p className="mt-1 whitespace-pre-line text-sm">{b.special_requirements}</p>
                  </div>
                )}
                {b.internal_notes && (
                  <div className="rounded-lg bg-amber-50 p-2">
                    <div className="text-xs font-semibold uppercase text-amber-700">{t('book.internalNotes')}</div>
                    <p className="mt-1 whitespace-pre-line text-sm">{b.internal_notes}</p>
                  </div>
                )}
                {b.cancel_reason && (
                  <div className="rounded-lg bg-red-50 p-2">
                    <div className="text-xs font-semibold uppercase text-red-700">{t('book.cancelReason')}</div>
                    <p className="mt-1 text-sm">
                      {b.cancel_reason} <span className="text-xs text-slate-500">({fmtDateTime(b.cancelled_at)})</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
          <Card title={t('nav.quotations')} pad={false}>
            <HistoryTable
              rows={b.quotations}
              link={(r) => `/quotations/${r.id}`}
              cols={[
                [t('quo.no'), (r) => <span className="font-medium text-brand-700">{r.quotation_no}</span>],
                [t('common.date'), (r) => fmtDate(r.quotation_date)],
                [t('common.total'), (r) => fmtRM(r.total), true],
                [t('common.status'), (r) => <StatusBadge status={r.status} />],
              ]}
            />
          </Card>
          <Card title={t('nav.invoices')} pad={false}>
            <HistoryTable
              rows={b.invoices}
              link={(r) => `/invoices/${r.id}`}
              cols={[
                [t('inv.no'), (r) => <span className="font-medium text-brand-700">{r.invoice_no}</span>],
                [t('inv.dueDate'), (r) => fmtDate(r.due_date)],
                [t('common.total'), (r) => fmtRM(r.total), true],
                [t('inv.paid'), (r) => fmtRM(r.amount_paid), true],
                [t('inv.balance'), (r) => fmtRM(r.balance), true],
                [t('common.status'), (r) => <StatusBadge status={r.status} />],
              ]}
            />
          </Card>
        </div>
        <div className="space-y-5">
          <div className="grid gap-3">
            <StatCard label={t('book.totalInvoiced')} value={fmtRM(b.summary.invoiced)} />
            <StatCard label={t('book.depositReceived')} tone="violet" value={fmtRM(b.summary.deposits)} />
            <StatCard label={t('book.totalPaid')} tone="green" value={fmtRM(b.summary.paid)} />
            <StatCard label={t('book.balance')} tone={b.summary.balance > 0 ? 'red' : 'slate'} value={fmtRM(b.summary.balance)} />
          </div>
          <Card title={t('book.paymentHistory')} pad={false}>
            {b.payments.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">{t('pay.none')}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {b.payments.map((p) => (
                  <li key={p.id}>
                    <Link to={`/receipts/${p.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50">
                      <div>
                        <div className="text-sm font-medium text-brand-700">{p.receipt_no}</div>
                        <div className="text-xs text-slate-500">
                          {fmtDate(p.payment_date)} · {t(`pt.${p.payment_type}`)} · {t(`pm.${p.method}`)}
                        </div>
                      </div>
                      <div className={`num whitespace-nowrap text-sm font-semibold ${p.status === 'Void' ? 'text-slate-400 line-through' : 'text-emerald-700'}`}>{fmtRM(p.amount)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
      <RecordPaymentModal open={!!payFor} invoice={payFor} onClose={() => setPayFor(null)} onRecorded={(r) => (reload(), nav(`/receipts/${r.payment.id}`))} />
    </div>
  );
}
