import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, ArrowLeft, Pencil, Copy, Trash2, Send, Wallet, XCircle, Undo2, ReceiptText } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useAuth, useConfirm, useFetch, useSettings, useToast } from '../lib/context.jsx';
import { del, post } from '../lib/api.js';
import DataTable, { FilterSelect } from '../components/DataTable.jsx';
import { PageHeader, StatusBadge, ErrorState, Loading, Card } from '../components/ui.jsx';
import DocumentPreview, { DocActions } from '../components/DocumentPreview.jsx';
import { RecordPaymentModal } from '../components/forms.jsx';
import { buildDocModel } from '../lib/docModel.js';
import { INVOICE_STATUSES } from '@shared/constants.js';
import { fmtDate, fmtRM, fmtDateTime, todayISO } from '../lib/format.js';

export default function Invoices() {
  const { t } = useT();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const { data, loading, error, reload } = useFetch('/invoices');
  const [status, setStatus] = useState('');
  const [payFor, setPayFor] = useState(null);

  const remove = async (i) => {
    if (!(await confirm({ title: t('inv.deleteTitle'), message: t('inv.deleteMsg', { no: i.invoice_no }), danger: true, confirmText: t('common.delete') }))) return;
    try {
      await del(`/invoices/${i.id}`);
      toast.success(t('common.deleted'));
      reload();
    } catch (e) {
      toast.error(e);
    }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  const rows = (data || []).filter((i) => !status || i.status === status);
  const live = (data || []).filter((i) => !['Cancelled', 'Draft'].includes(i.status));
  const today = todayISO();

  return (
    <div>
      <PageHeader
        title={t('nav.invoices')}
        subtitle={t('inv.subtitle', { total: fmtRM(live.reduce((s, i) => s + i.total, 0)), outstanding: fmtRM(live.reduce((s, i) => s + i.balance, 0)) })}
        actions={
          <Link to="/invoices/new" className="btn-primary">
            <Plus className="h-4 w-4" /> {t('inv.new')}
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {['', ...INVOICE_STATUSES].map((s) => (
          <button key={s || 'all'} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1 text-sm ${status === s ? 'border-brand-600 bg-brand-700 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}>
            {s ? t(`st.${s}`) : t('common.all')} <span className="ml-1 opacity-70">{s ? (data || []).filter((i) => i.status === s).length : data?.length || 0}</span>
          </button>
        ))}
      </div>
      <DataTable
        storageKey="invoices"
        rows={rows}
        loading={loading}
        searchText={(i) => [i.invoice_no, i.customer_name, i.customer_company, i.event_name, i.booking_no, i.quotation_no].join(' ')}
        searchPlaceholder={t('inv.searchPlaceholder')}
        filters={<FilterSelect value={status} onChange={setStatus} placeholder={t('common.allStatuses')} options={INVOICE_STATUSES.map((s) => ({ value: s, label: t(`st.${s}`) }))} />}
        defaultSort={{ key: 'invoice_date', dir: 'desc' }}
        onRowClick={(i) => nav(`/invoices/${i.id}`)}
        onView={(i) => nav(`/invoices/${i.id}`)}
        onEdit={{ fn: (i) => nav(`/invoices/${i.id}/edit`), when: (i) => !['Paid', 'Cancelled'].includes(i.status) }}
        onDelete={isAdmin ? remove : undefined}
        emptyTitle={t('inv.empty')}
        emptyAction={
          <Link to="/invoices/new" className="btn-primary">
            <Plus className="h-4 w-4" /> {t('inv.new')}
          </Link>
        }
        footer={(list) => (
          <tr>
            <td className="td" colSpan={3}>
              {t('common.total')} ({list.length})
            </td>
            <td className="td num hidden text-right md:table-cell" />
            <td className="td num text-right">{fmtRM(list.filter((i) => i.status !== 'Cancelled').reduce((s, i) => s + i.total, 0))}</td>
            <td className="td num hidden text-right sm:table-cell">{fmtRM(list.filter((i) => i.status !== 'Cancelled').reduce((s, i) => s + i.balance, 0))}</td>
            <td className="td" colSpan={3} />
          </tr>
        )}
        columns={[
          { key: 'invoice_no', label: t('inv.no'), render: (i) => <span className="font-medium text-brand-700">{i.invoice_no}</span> },
          {
            key: 'customer_name',
            label: t('cust.customer'),
            render: (i) => (
              <div>
                <div className="font-medium text-slate-800">{i.customer_name}</div>
                <div className="text-xs text-slate-500">{i.booking_no || i.event_name || '-'}</div>
              </div>
            ),
          },
          { key: 'invoice_date', label: t('common.date'), render: (i) => fmtDate(i.invoice_date) },
          {
            key: 'due_date',
            label: t('inv.dueDate'),
            hide: 'md',
            render: (i) => <span className={i.balance > 0 && i.due_date < today && !['Draft', 'Cancelled'].includes(i.status) ? 'font-medium text-red-600' : ''}>{fmtDate(i.due_date)}</span>,
          },
          { key: 'total', label: t('common.total'), align: 'right', render: (i) => fmtRM(i.total) },
          { key: 'balance', label: t('inv.balance'), align: 'right', hide: 'sm', render: (i) => <span className={i.balance > 0 && i.status !== 'Cancelled' ? 'font-semibold text-red-600' : 'text-slate-400'}>{fmtRM(i.balance)}</span> },
          { key: 'status', label: t('common.status'), render: (i) => <StatusBadge status={i.status} /> },
          {
            key: 'pay',
            label: '',
            sort: false,
            render: (i) =>
              i.balance > 0 && i.status !== 'Cancelled' ? (
                <button
                  className="btn-success btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPayFor(i);
                  }}
                >
                  <Wallet className="h-3.5 w-3.5" /> {t('pay.pay')}
                </button>
              ) : null,
          },
        ]}
      />
      <RecordPaymentModal open={!!payFor} invoice={payFor} onClose={() => setPayFor(null)} onRecorded={(r) => nav(`/receipts/${r.payment.id}`)} />
    </div>
  );
}

export function InvoiceDetail() {
  const { id } = useParams();
  const { t, lang } = useT();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const { data: inv, loading, error, reload, setData } = useFetch(`/invoices/${id}`);
  const [busy, setBusy] = useState(false);
  const [pay, setPay] = useState(false);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !inv) return <Loading />;

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
  const setStatus = (status, extra) =>
    act(async () => {
      setData(await post(`/invoices/${inv.id}/status`, { status, ...extra }));
      toast.success(t('inv.statusUpdated', { status: t(`st.${status}`) }));
    });
  const cancel = async () => {
    const reason = await confirm({ title: t('inv.cancelTitle'), message: t('inv.cancelMsg'), input: t('inv.cancelReason'), danger: true, confirmText: t('inv.cancelInvoice') });
    if (reason) setStatus('Cancelled', { reason: typeof reason === 'string' ? reason : '' });
  };
  const duplicate = () =>
    act(async () => {
      const n = await post(`/invoices/${inv.id}/duplicate`);
      toast.success(t('inv.duplicated', { no: n.invoice_no }));
      nav(`/invoices/${n.id}/edit`);
    });
  const remove = async () => {
    if (!(await confirm({ title: t('inv.deleteTitle'), message: t('inv.deleteMsg', { no: inv.invoice_no }), danger: true, confirmText: t('common.delete') }))) return;
    act(async () => {
      await del(`/invoices/${inv.id}`);
      toast.success(t('common.deleted'));
      nav('/invoices');
    });
  };
  const onShared = async () => {
    if (inv.status === 'Draft' && (await confirm({ title: t('inv.markSentTitle'), message: t('inv.markSentMsg'), confirmText: t('inv.markSent') }))) setStatus('Sent');
  };

  const model = buildDocModel('invoice', inv, settings, lang);
  const valid = inv.payments.filter((p) => p.status === 'Valid');
  const pct = inv.total ? Math.min(100, Math.round((inv.amount_paid / inv.total) * 100)) : 0;
  const canPay = inv.balance > 0 && inv.status !== 'Cancelled';

  return (
    <div>
      <PageHeader
        back={
          <Link to="/invoices" className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" /> {t('nav.invoices')}
          </Link>
        }
        title={inv.invoice_no}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Link to={`/customers/${inv.customer_id}`} className="text-brand-700 hover:underline">
              {inv.customer_name}
            </Link>{' '}
            · {fmtRM(inv.total)} <StatusBadge status={inv.status} />
          </span>
        }
        actions={<DocActions model={model} shareApi={`/invoices/${inv.id}/share`} phone={inv.customer_phone} email={inv.customer_email} onShared={onShared} />}
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="order-2 xl:order-1">
          <DocumentPreview model={model} />
        </div>
        <div className="order-1 space-y-4 xl:order-2">
          <Card title={t('inv.paymentStatus')}>
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>
                  {t('inv.paid')} {fmtRM(inv.amount_paid)}
                </span>
                <span>{pct}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('inv.total')}</dt>
                <dd className="num font-semibold">{fmtRM(inv.total)}</dd>
              </div>
              {inv.deposit_required > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">
                    {t('doc.depositRequired')} ({Number(inv.deposit_percent)}%)
                  </dt>
                  <dd className="num">{fmtRM(inv.deposit_required)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('doc.depositPaid')}</dt>
                <dd className="num">{fmtRM(inv.deposit_paid)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('inv.paid')}</dt>
                <dd className="num text-emerald-700">{fmtRM(inv.amount_paid)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1.5 text-base">
                <dt className="font-semibold">{t('inv.balance')}</dt>
                <dd className={`num font-bold ${inv.balance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmtRM(inv.balance)}</dd>
              </div>
            </dl>
            {canPay && (
              <button className="btn-success mt-4 w-full" onClick={() => setPay(true)} disabled={busy}>
                <Wallet className="h-4 w-4" /> {t('pay.record')}
              </button>
            )}
          </Card>
          <Card title={t('inv.receipts')} pad={false}>
            {inv.payments.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">{t('pay.none')}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {inv.payments.map((p) => (
                  <li key={p.id}>
                    <Link to={`/receipts/${p.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <ReceiptText className="h-4 w-4 text-slate-400" />
                        <div>
                          <div className="text-sm font-medium text-brand-700">{p.receipt_no}</div>
                          <div className="text-xs text-slate-500">
                            {fmtDate(p.payment_date)} · {t(`pt.${p.payment_type}`)} · {t(`pm.${p.method}`)}
                          </div>
                        </div>
                      </div>
                      <div className={`num whitespace-nowrap text-sm font-semibold ${p.status === 'Void' ? 'text-slate-400 line-through' : 'text-emerald-700'}`}>{fmtRM(p.amount)}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title={t('common.actions')}>
            <div className="flex flex-col gap-2">
              {inv.status === 'Draft' && (
                <button className="btn-primary" onClick={() => setStatus('Sent')} disabled={busy}>
                  <Send className="h-4 w-4" /> {t('inv.markSent')}
                </button>
              )}
              {!['Paid', 'Cancelled'].includes(inv.status) && (
                <Link to={`/invoices/${inv.id}/edit`} className="btn-secondary">
                  <Pencil className="h-4 w-4" /> {t('common.edit')}
                </Link>
              )}
              <button className="btn-secondary" onClick={duplicate} disabled={busy}>
                <Copy className="h-4 w-4" /> {t('common.duplicate')}
              </button>
              {inv.status === 'Sent' && valid.length === 0 && (
                <button className="btn-ghost btn-sm" onClick={() => setStatus('Draft')} disabled={busy}>
                  <Undo2 className="h-4 w-4" /> {t('quo.backToDraft')}
                </button>
              )}
              {inv.status !== 'Cancelled' && valid.length === 0 && (
                <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={cancel} disabled={busy}>
                  <XCircle className="h-4 w-4" /> {t('inv.cancelInvoice')}
                </button>
              )}
              {isAdmin && inv.payments.length === 0 && (
                <button className="btn-ghost text-red-600 hover:bg-red-50" onClick={remove} disabled={busy}>
                  <Trash2 className="h-4 w-4" /> {t('common.delete')}
                </button>
              )}
            </div>
          </Card>
          <Card title={t('inv.links')}>
            <dl className="space-y-1.5 text-sm">
              {inv.booking_id && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">{t('book.no')}</dt>
                  <dd>
                    <Link className="text-brand-700 hover:underline" to={`/bookings/${inv.booking_id}`}>
                      {inv.booking_no}
                    </Link>{' '}
                    <StatusBadge status={inv.booking_status} />
                  </dd>
                </div>
              )}
              {inv.quotation_id && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">{t('quo.no')}</dt>
                  <dd>
                    <Link className="text-brand-700 hover:underline" to={`/quotations/${inv.quotation_id}`}>
                      {inv.quotation_no}
                    </Link>
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">{t('common.createdAt')}</dt>
                <dd>{fmtDateTime(inv.created_at)}</dd>
              </div>
              {inv.sent_at && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">{t('st.Sent')}</dt>
                  <dd>{fmtDateTime(inv.sent_at)}</dd>
                </div>
              )}
              {inv.paid_at && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">{t('st.Paid')}</dt>
                  <dd>{fmtDateTime(inv.paid_at)}</dd>
                </div>
              )}
              {inv.cancel_reason && (
                <div className="rounded bg-red-50 p-2 text-red-700">
                  {t('inv.cancelReason')}: {inv.cancel_reason}
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
      <RecordPaymentModal
        open={pay}
        invoice={inv}
        onClose={() => setPay(false)}
        onRecorded={async (r) => {
          setData(r.invoice);
          if (await confirm({ title: t('pay.receiptReady'), message: t('pay.receiptReadyMsg', { no: r.payment.receipt_no }), confirmText: t('pay.viewReceipt') })) nav(`/receipts/${r.payment.id}`);
        }}
      />
    </div>
  );
}
