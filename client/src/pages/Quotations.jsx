import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, ArrowLeft, Pencil, Copy, Trash2, Send, Eye, CheckCircle2, XCircle, FileSpreadsheet, ClipboardCheck, Undo2 } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useAuth, useConfirm, useFetch, useSettings, useToast } from '../lib/context.jsx';
import { del, post } from '../lib/api.js';
import DataTable, { FilterSelect } from '../components/DataTable.jsx';
import { PageHeader, StatusBadge, ErrorState, Loading, Card, Modal, Field, DateInput } from '../components/ui.jsx';
import DocumentPreview, { DocActions } from '../components/DocumentPreview.jsx';
import { buildDocModel } from '../lib/docModel.js';
import { QUOTATION_STATUSES } from '@shared/constants.js';
import { fmtDate, fmtRM, fmtDateTime, todayISO } from '../lib/format.js';

export default function Quotations() {
  const { t } = useT();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const { data, loading, error, reload } = useFetch('/quotations');
  const [status, setStatus] = useState('');

  const remove = async (q) => {
    if (!(await confirm({ title: t('quo.deleteTitle'), message: t('quo.deleteMsg', { no: q.quotation_no }), danger: true, confirmText: t('common.delete') }))) return;
    try {
      await del(`/quotations/${q.id}`);
      toast.success(t('common.deleted'));
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  const rows = (data || []).filter((q) => !status || q.status === status);
  const counts = Object.fromEntries(QUOTATION_STATUSES.map((s) => [s, (data || []).filter((q) => q.status === s).length]));

  return (
    <div>
      <PageHeader
        title={t('nav.quotations')}
        subtitle={t('quo.subtitle')}
        actions={
          <Link to="/quotations/new" className="btn-primary">
            <Plus className="h-4 w-4" /> {t('quo.new')}
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {['', ...QUOTATION_STATUSES].map((s) => (
          <button key={s || 'all'} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1 text-sm ${status === s ? 'border-brand-600 bg-brand-700 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}>
            {s ? t(`st.${s}`) : t('common.all')} <span className="ml-1 opacity-70">{s ? counts[s] : data?.length || 0}</span>
          </button>
        ))}
      </div>
      <DataTable
        storageKey="quotations"
        rows={rows}
        loading={loading}
        searchText={(q) => [q.quotation_no, q.customer_name, q.customer_company, q.event_name, q.booking_no].join(' ')}
        searchPlaceholder={t('quo.searchPlaceholder')}
        filters={<FilterSelect value={status} onChange={setStatus} placeholder={t('common.allStatuses')} options={QUOTATION_STATUSES.map((s) => ({ value: s, label: t(`st.${s}`) }))} />}
        defaultSort={{ key: 'quotation_date', dir: 'desc' }}
        onRowClick={(q) => nav(`/quotations/${q.id}`)}
        onView={(q) => nav(`/quotations/${q.id}`)}
        onEdit={{ fn: (q) => nav(`/quotations/${q.id}/edit`), when: (q) => q.status !== 'Approved' }}
        onDelete={isAdmin ? remove : undefined}
        emptyTitle={t('quo.empty')}
        emptyAction={
          <Link to="/quotations/new" className="btn-primary">
            <Plus className="h-4 w-4" /> {t('quo.new')}
          </Link>
        }
        columns={[
          { key: 'quotation_no', label: t('quo.no'), render: (q) => <span className="font-medium text-brand-700">{q.quotation_no}</span> },
          {
            key: 'customer_name',
            label: t('cust.customer'),
            render: (q) => (
              <div>
                <div className="font-medium text-slate-800">{q.customer_name}</div>
                <div className="text-xs text-slate-500">{q.event_name || '-'}</div>
              </div>
            ),
          },
          { key: 'quotation_date', label: t('common.date'), render: (q) => fmtDate(q.quotation_date) },
          { key: 'valid_until', label: t('quo.validUntil'), hide: 'md', render: (q) => fmtDate(q.valid_until) },
          { key: 'booking_no', label: t('book.no'), hide: 'lg', render: (q) => q.booking_no || '-' },
          { key: 'total', label: t('common.total'), align: 'right', render: (q) => fmtRM(q.total) },
          { key: 'status', label: t('common.status'), render: (q) => <StatusBadge status={q.status} /> },
        ]}
      />
    </div>
  );
}

export function QuotationDetail() {
  const { id } = useParams();
  const { t, lang } = useT();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const { data: q, loading, error, reload, setData } = useFetch(`/quotations/${id}`);
  const [busy, setBusy] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !q) return <Loading />;

  const act = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      if (e.status === 409 && e.data?.code === 'EXISTS') {
        if (await confirm({ title: t('quo.invoiceExistsTitle'), message: t('quo.invoiceExistsMsg'), confirmText: t('quo.openInvoice') })) nav(`/invoices/${e.data.invoice_id}`);
      } else toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  const setStatus = (status) =>
    act(async () => {
      const r = await post(`/quotations/${q.id}/status`, { status });
      setData(r);
      toast.success(t('quo.statusUpdated', { status: t(`st.${status}`) }));
    });
  const approve = async () => {
    if (!(await confirm({ title: t('quo.approveTitle'), message: q.booking_id ? t('quo.approveMsgBooking', { no: q.booking_no }) : t('quo.approveMsg'), confirmText: t('quo.approve') }))) return;
    setStatus('Approved');
  };
  const toInvoice = () =>
    act(async () => {
      const inv = await post(`/quotations/${q.id}/convert-invoice`);
      toast.success(t('inv.created', { no: inv.invoice_no }));
      nav(`/invoices/${inv.id}`);
    });
  const duplicate = () =>
    act(async () => {
      const n = await post(`/quotations/${q.id}/duplicate`);
      toast.success(t('quo.duplicated', { no: n.quotation_no }));
      nav(`/quotations/${n.id}/edit`);
    });
  const remove = async () => {
    if (!(await confirm({ title: t('quo.deleteTitle'), message: t('quo.deleteMsg', { no: q.quotation_no }), danger: true, confirmText: t('common.delete') }))) return;
    act(async () => {
      await del(`/quotations/${q.id}`);
      toast.success(t('common.deleted'));
      nav('/quotations');
    });
  };
  const onShared = async () => {
    if (q.status === 'Draft' && (await confirm({ title: t('quo.markSentTitle'), message: t('quo.markSentMsg'), confirmText: t('quo.markSent') }))) setStatus('Sent');
  };

  const model = buildDocModel('quotation', q, settings, lang);
  const expired = q.valid_until < todayISO();
  const openInvoices = q.invoices.filter((i) => i.status !== 'Cancelled');

  return (
    <div>
      <PageHeader
        back={
          <Link to="/quotations" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" /> {t('nav.quotations')}
          </Link>
        }
        title={q.quotation_no}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Link to={`/customers/${q.customer_id}`} className="text-brand-700 hover:underline">
              {q.customer_name}
            </Link>{' '}
            · {fmtRM(q.total)} <StatusBadge status={q.status} />
          </span>
        }
        actions={<DocActions model={model} shareApi={`/quotations/${q.id}/share`} phone={q.customer_phone} email={q.customer_email} onShared={onShared} />}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="order-2 xl:order-1">
          <DocumentPreview model={model} />
        </div>
        <div className="order-1 space-y-4 xl:order-2">
          <Card title={t('quo.workflow')}>
            <div className="flex flex-col gap-2">
              {q.status === 'Approved' ? (
                <>
                  {openInvoices.length === 0 ? (
                    <button className="btn-success" onClick={toInvoice} disabled={busy}>
                      <FileSpreadsheet className="h-4 w-4" /> {t('quo.toInvoice')}
                    </button>
                  ) : (
                    openInvoices.map((i) => (
                      <Link key={i.id} to={`/invoices/${i.id}`} className="btn-secondary">
                        <FileSpreadsheet className="h-4 w-4" /> {i.invoice_no} <StatusBadge status={i.status} />
                      </Link>
                    ))
                  )}
                  {q.booking_id ? (
                    <Link to={`/bookings/${q.booking_id}`} className="btn-secondary">
                      <ClipboardCheck className="h-4 w-4" /> {q.booking_no} <StatusBadge status={q.booking_status} />
                    </Link>
                  ) : (
                    <button className="btn-primary" onClick={() => setBookingModal(true)} disabled={busy}>
                      <ClipboardCheck className="h-4 w-4" /> {t('quo.toBooking')}
                    </button>
                  )}
                  {openInvoices.length === 0 && (
                    <button className="btn-ghost btn-sm" onClick={() => setStatus('Sent')} disabled={busy}>
                      <Undo2 className="h-4 w-4" /> {t('quo.unapprove')}
                    </button>
                  )}
                </>
              ) : (
                <>
                  {expired && <p className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">{t('quo.expiredHint')}</p>}
                  {['Draft', 'Rejected', 'Expired'].includes(q.status) && (
                    <button className="btn-primary" onClick={() => setStatus('Sent')} disabled={busy || expired}>
                      <Send className="h-4 w-4" /> {t('quo.markSent')}
                    </button>
                  )}
                  {q.status === 'Sent' && (
                    <button className="btn-secondary" onClick={() => setStatus('Viewed')} disabled={busy}>
                      <Eye className="h-4 w-4" /> {t('quo.markViewed')}
                    </button>
                  )}
                  <button className="btn-success" onClick={approve} disabled={busy || expired}>
                    <CheckCircle2 className="h-4 w-4" /> {t('quo.approve')}
                  </button>
                  {q.status !== 'Rejected' && (
                    <button className="btn-secondary text-red-600" onClick={() => setStatus('Rejected')} disabled={busy}>
                      <XCircle className="h-4 w-4" /> {t('quo.reject')}
                    </button>
                  )}
                  {q.status !== 'Draft' && (
                    <button className="btn-ghost btn-sm" onClick={() => setStatus('Draft')} disabled={busy}>
                      <Undo2 className="h-4 w-4" /> {t('quo.backToDraft')}
                    </button>
                  )}
                </>
              )}
            </div>
          </Card>
          <Card title={t('common.actions')}>
            <div className="flex flex-col gap-2">
              {q.status !== 'Approved' && (
                <Link to={`/quotations/${q.id}/edit`} className="btn-secondary">
                  <Pencil className="h-4 w-4" /> {t('common.edit')}
                </Link>
              )}
              <button className="btn-secondary" onClick={duplicate} disabled={busy}>
                <Copy className="h-4 w-4" /> {t('common.duplicate')}
              </button>
              {isAdmin && openInvoices.length === 0 && q.invoices.length === 0 && (
                <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={remove} disabled={busy}>
                  <Trash2 className="h-4 w-4" /> {t('common.delete')}
                </button>
              )}
            </div>
          </Card>
          <Card title={t('common.history')}>
            <dl className="space-y-1.5 text-sm">
              <Stamp label={t('common.createdAt')} v={q.created_at} />
              <Stamp label={t('st.Sent')} v={q.sent_at} />
              <Stamp label={t('st.Viewed')} v={q.viewed_at} />
              <Stamp label={t('st.Approved')} v={q.approved_at} />
              <Stamp label={t('st.Rejected')} v={q.rejected_at} />
            </dl>
          </Card>
        </div>
      </div>
      <ConvertBookingModal open={bookingModal} onClose={() => setBookingModal(false)} q={q} onDone={(b) => nav(`/bookings/${b.id}`)} />
    </div>
  );
}

function Stamp({ label, v }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-700">{fmtDateTime(v)}</dd>
    </div>
  );
}

function ConvertBookingModal({ open, onClose, q, onDone }) {
  const { t } = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const [f, setF] = useState({ event_date: q.event_date || '', start_time: '', end_time: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (allow_overlap = false) => {
    if (!f.event_date) return toast.error(t('quo.eventDateRequired'));
    setBusy(true);
    try {
      const b = await post(`/quotations/${q.id}/convert-booking`, { ...f, allow_overlap });
      toast.success(t('book.created', { no: b.booking_no }));
      onDone(b);
    } catch (e) {
      if (e.data?.code === 'OVERLAP' && (await confirm({ title: t('book.overlapTitle'), message: t('book.overlapMsg'), confirmText: t('book.saveAnyway') }))) {
        setBusy(false);
        return submit(true);
      }
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('quo.toBooking')}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" disabled={busy} onClick={() => submit()}>
            {t('quo.createBooking')}
          </button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600">{t('quo.toBookingMsg')}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('book.date')} required className="sm:col-span-2">
          <DateInput value={f.event_date} onChange={(v) => setF({ ...f, event_date: v })} />
        </Field>
        <Field label={t('book.startTime')}>
          <input type="time" className="input" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} />
        </Field>
        <Field label={t('book.endTime')}>
          <input type="time" className="input" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
