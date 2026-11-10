import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Pencil } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useAuth, useConfirm, useFetch, useSettings, useToast } from '../lib/context.jsx';
import { post, put } from '../lib/api.js';
import DataTable, { FilterSelect } from '../components/DataTable.jsx';
import { PageHeader, StatusBadge, ErrorState, Loading, Card, Modal, Field, DateInput } from '../components/ui.jsx';
import DocumentPreview, { DocActions } from '../components/DocumentPreview.jsx';
import { DateRangeFilter, initialRange } from '../components/forms.jsx';
import { buildDocModel } from '../lib/docModel.js';
import { PAYMENT_METHODS } from '@shared/constants.js';
import { fmtDate, fmtRM, fmtDateTime } from '../lib/format.js';
import { qs } from '../lib/api.js';

export default function Receipts() {
  const { t } = useT();
  const nav = useNavigate();
  const [range, setRange] = useState(() => initialRange('thisYear'));
  const [method, setMethod] = useState('');
  const { data, loading, error, reload } = useFetch(`/payments${qs({ from: range.from, to: range.to, method })}`);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const valid = (data || []).filter((p) => p.status === 'Valid');
  return (
    <div>
      <PageHeader title={t('nav.receipts')} subtitle={t('rec.subtitle', { n: valid.length, total: fmtRM(valid.reduce((s, p) => s + p.amount, 0)) })} />
      <DataTable
        storageKey="receipts"
        rows={data}
        loading={loading}
        searchText={(p) => [p.receipt_no, p.invoice_no, p.booking_no, p.customer_name, p.reference].join(' ')}
        searchPlaceholder={t('rec.searchPlaceholder')}
        filters={
          <>
            <DateRangeFilter value={range} onChange={setRange} presets={['thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'month', 'year', 'all', 'custom']} />
            <FilterSelect value={method} onChange={setMethod} placeholder={t('pay.allMethods')} options={PAYMENT_METHODS.map((m) => ({ value: m, label: t(`pm.${m}`) }))} />
          </>
        }
        defaultSort={{ key: 'payment_date', dir: 'desc' }}
        onRowClick={(p) => nav(`/receipts/${p.id}`)}
        onView={(p) => nav(`/receipts/${p.id}`)}
        emptyTitle={t('rec.empty')}
        emptyMessage={t('rec.emptyMsg')}
        columns={[
          { key: 'receipt_no', label: t('rec.no'), sort: (p) => p.id, render: (p) => <span className="font-medium text-brand-700">{p.receipt_no}</span> },
          { key: 'payment_date', label: t('common.date'), sort: (p) => `${p.payment_date}-${String(p.id).padStart(8, '0')}`, render: (p) => fmtDate(p.payment_date) },
          {
            key: 'customer_name',
            label: t('cust.customer'),
            render: (p) => (
              <div>
                <div className="font-medium text-slate-800">{p.customer_name}</div>
                <div className="text-xs text-slate-500">
                  {p.invoice_no}
                  {p.booking_no && ` · ${p.booking_no}`}
                </div>
              </div>
            ),
          },
          { key: 'payment_type', label: t('pay.type'), hide: 'md', render: (p) => t(`pt.${p.payment_type}`) },
          { key: 'method', label: t('pay.method'), hide: 'sm', render: (p) => t(`pm.${p.method}`) },
          { key: 'amount', label: t('pay.amount'), align: 'right', render: (p) => <span className={p.status === 'Void' ? 'text-slate-400 line-through' : 'font-semibold'}>{fmtRM(p.amount)}</span> },
          { key: 'balance_after', label: t('rec.balanceAfter'), align: 'right', hide: 'lg', render: (p) => fmtRM(p.balance_after) },
          { key: 'status', label: t('common.status'), hide: 'md', render: (p) => <StatusBadge status={p.status} /> },
        ]}
      />
    </div>
  );
}

export function ReceiptDetail() {
  const { id } = useParams();
  const { t, lang } = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const { data: p, loading, error, reload, setData } = useFetch(`/payments/${id}`);
  const [edit, setEdit] = useState(false);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !p) return <Loading />;
  const model = buildDocModel('receipt', p, settings, lang);
  const voidIt = async () => {
    const reason = await confirm({ title: t('rec.voidTitle'), message: t('rec.voidMsg', { no: p.receipt_no, amount: fmtRM(p.amount) }), input: t('rec.voidReason'), inputRequired: true, danger: true, confirmText: t('rec.void') });
    if (!reason) return;
    try {
      setData(await post(`/payments/${p.id}/void`, { reason }));
      toast.success(t('rec.voided'));
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <div>
      <PageHeader
        back={
          <Link to="/receipts" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" /> {t('nav.receipts')}
          </Link>
        }
        title={p.receipt_no}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {p.customer_name} · {fmtRM(p.amount)} <StatusBadge status={p.status} />
          </span>
        }
        actions={<DocActions model={model} shareApi={`/payments/${p.id}/share`} phone={p.customer_phone} email={p.customer_email} />}
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="order-2 xl:order-1">
          <DocumentPreview model={model} />
        </div>
        <div className="order-1 space-y-4 xl:order-2">
          <Card title={t('rec.links')}>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('inv.invoice')}</dt>
                <dd>
                  <Link className="text-brand-700 hover:underline" to={`/invoices/${p.invoice_id}`}>
                    {p.invoice_no}
                  </Link>{' '}
                  <StatusBadge status={p.invoice_status} />
                </dd>
              </div>
              {p.booking_id && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">{t('book.no')}</dt>
                  <dd>
                    <Link className="text-brand-700 hover:underline" to={`/bookings/${p.booking_id}`}>
                      {p.booking_no}
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('cust.customer')}</dt>
                <dd>
                  <Link className="text-brand-700 hover:underline" to={`/customers/${p.customer_id}`}>
                    {p.customer_name}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('inv.balance')}</dt>
                <dd className="num font-semibold">{fmtRM(p.invoice_balance)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('common.createdAt')}</dt>
                <dd>{fmtDateTime(p.created_at)}</dd>
              </div>
              {p.voided_at && (
                <div className="rounded bg-red-50 p-2 text-red-700">
                  {t('st.Void')} {fmtDateTime(p.voided_at)}: {p.void_reason}
                </div>
              )}
            </dl>
          </Card>
          {p.status === 'Valid' && (
            <Card title={t('common.actions')}>
              <div className="flex flex-col gap-2">
                <button className="btn-secondary" onClick={() => setEdit(true)}>
                  <Pencil className="h-4 w-4" /> {t('rec.editDetails')}
                </button>
                {isAdmin && (
                  <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={voidIt}>
                    <Ban className="h-4 w-4" /> {t('rec.void')}
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
      <EditReceiptModal open={edit} onClose={() => setEdit(false)} p={p} onSaved={setData} />
    </div>
  );
}

function EditReceiptModal({ open, onClose, p, onSaved }) {
  const { t } = useT();
  const toast = useToast();
  const [f, setF] = useState({ payment_date: p.payment_date, method: p.method, reference: p.reference || '', description: p.description || '', received_by: p.received_by || '' });
  const save = async () => {
    try {
      onSaved(await put(`/payments/${p.id}`, f));
      toast.success(t('common.saved'));
      onClose();
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('rec.editDetails')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" onClick={save}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-500">{t('rec.editHint')}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('pay.date')}>
          <DateInput value={f.payment_date} onChange={(v) => setF({ ...f, payment_date: v })} />
        </Field>
        <Field label={t('pay.method')}>
          <select className="input" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`pm.${m}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('pay.reference')}>
          <input className="input" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        </Field>
        <Field label={t('pay.receivedBy')}>
          <input className="input" value={f.received_by} onChange={(e) => setF({ ...f, received_by: e.target.value })} />
        </Field>
        <Field label={t('pay.description')} className="sm:col-span-2">
          <input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
