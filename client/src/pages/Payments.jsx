import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Wallet, FileSpreadsheet, CircleDollarSign, AlertCircle, AlarmClock, PiggyBank, Hourglass, Ban } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useAuth, useConfirm, useFetch, useToast } from '../lib/context.jsx';
import { post, qs } from '../lib/api.js';
import DataTable, { FilterSelect } from '../components/DataTable.jsx';
import { PageHeader, StatCard, StatusBadge, ErrorState, Tabs } from '../components/ui.jsx';
import { DateRangeFilter, initialRange, RecordPaymentModal } from '../components/forms.jsx';
import { PAYMENT_METHODS } from '@shared/constants.js';
import { fmtDate, fmtRM, todayISO } from '../lib/format.js';

export default function Payments() {
  const { t } = useT();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [range, setRange] = useState(() => initialRange('thisYear'));
  const [method, setMethod] = useState('');
  const [customer, setCustomer] = useState('');
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState('outstanding');
  const [payFor, setPayFor] = useState(null);
  const [recordOpen, setRecordOpen] = useState(false);

  const summary = useFetch(`/payments/summary${qs({ from: range.from, to: range.to })}`);
  const payments = useFetch(`/payments${qs({ from: range.from, to: range.to, method, customer_id: customer, status })}`);
  const invoices = useFetch('/invoices?outstanding=1');
  const { data: customers } = useFetch('/customers');

  useEffect(() => {
    if (params.get('record')) {
      setRecordOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const refresh = () => {
    summary.reload();
    payments.reload();
    invoices.reload();
  };
  const voidPayment = async (p) => {
    const reason = await confirm({ title: t('rec.voidTitle'), message: t('rec.voidMsg', { no: p.receipt_no, amount: fmtRM(p.amount) }), input: t('rec.voidReason'), inputRequired: true, danger: true, confirmText: t('rec.void') });
    if (!reason) return;
    try {
      await post(`/payments/${p.id}/void`, { reason });
      toast.success(t('rec.voided'));
      refresh();
    } catch (e) {
      toast.error(e);
    }
  };

  if (summary.error) return <ErrorState error={summary.error} onRetry={refresh} />;
  const s = summary.data;
  const today = todayISO();
  const openInvoices = (invoices.data || []).filter((i) => !customer || i.customer_id === Number(customer));
  const overdue = openInvoices.filter((i) => i.status === 'Overdue');

  return (
    <div>
      <PageHeader
        title={t('nav.payments')}
        subtitle={t('pay.subtitle')}
        actions={
          <>
            <DateRangeFilter value={range} onChange={setRange} presets={['thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'month', 'year', 'all', 'custom']} />
            <button className="btn-success" onClick={() => setRecordOpen(true)}>
              <Wallet className="h-4 w-4" /> {t('pay.record')}
            </button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard icon={FileSpreadsheet} label={t('pay.totalInvoiced')} value={s ? fmtRM(s.total_invoiced) : '...'} hint={s && t('pay.nInvoices', { n: s.invoice_count })} />
        <StatCard icon={CircleDollarSign} tone="green" label={t('pay.totalCollected')} value={s ? fmtRM(s.total_collected) : '...'} hint={s && t('pay.nPayments', { n: s.payment_count })} />
        <StatCard icon={AlertCircle} tone="amber" label={t('pay.totalOutstanding')} value={s ? fmtRM(s.total_outstanding) : '...'} hint={t('pay.allOpenInvoices')} />
        <StatCard icon={AlarmClock} tone="red" label={t('pay.totalOverdue')} value={s ? fmtRM(s.total_overdue) : '...'} hint={s && t('pay.nInvoices', { n: s.overdue_count })} />
        <StatCard icon={PiggyBank} tone="violet" label={t('pay.depositsReceived')} value={s ? fmtRM(s.deposits_received) : '...'} />
        <StatCard icon={Hourglass} tone="slate" label={t('pay.pendingPayments')} value={s ? s.pending_payments : '...'} hint={t('pay.invoicesAwaiting')} />
      </div>

      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'outstanding', label: t('pay.outstandingInvoices'), count: openInvoices.length },
            { value: 'overdue', label: t('pay.overdueInvoices'), count: overdue.length },
            { value: 'history', label: t('pay.history'), count: payments.data?.length },
          ]}
        />
        {tab !== 'history' ? (
          <DataTable
            key={tab}
            storageKey="pay-open"
            rows={tab === 'overdue' ? overdue : openInvoices}
            loading={invoices.loading}
            searchText={(i) => [i.invoice_no, i.customer_name, i.booking_no].join(' ')}
            filters={<FilterSelect value={customer} onChange={setCustomer} placeholder={t('pay.allCustomers')} options={(customers || []).map((c) => ({ value: c.id, label: c.name }))} />}
            defaultSort={{ key: 'due_date', dir: 'asc' }}
            onRowClick={(i) => nav(`/invoices/${i.id}`)}
            emptyTitle={tab === 'overdue' ? t('pay.noOverdue') : t('pay.noOutstanding')}
            columns={[
              { key: 'invoice_no', label: t('inv.no'), render: (i) => <span className="font-medium text-brand-700">{i.invoice_no}</span> },
              { key: 'customer_name', label: t('cust.customer') },
              {
                key: 'due_date',
                label: t('inv.dueDate'),
                render: (i) => {
                  const days = Math.round((new Date(today) - new Date(i.due_date)) / 86400000);
                  return (
                    <div>
                      <div className={days > 0 ? 'font-medium text-red-600' : ''}>{fmtDate(i.due_date)}</div>
                      {days > 0 && <div className="text-xs text-red-500">{t('pay.daysOverdue', { n: days })}</div>}
                    </div>
                  );
                },
              },
              { key: 'total', label: t('common.total'), align: 'right', hide: 'md', render: (i) => fmtRM(i.total) },
              { key: 'amount_paid', label: t('inv.paid'), align: 'right', hide: 'sm', render: (i) => fmtRM(i.amount_paid) },
              { key: 'balance', label: t('inv.balance'), align: 'right', render: (i) => <span className="font-semibold text-red-600">{fmtRM(i.balance)}</span> },
              { key: 'status', label: t('common.status'), hide: 'md', render: (i) => <StatusBadge status={i.status} /> },
              {
                key: 'pay',
                label: '',
                sort: false,
                render: (i) => (
                  <button
                    className="btn-success btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPayFor(i);
                    }}
                  >
                    <Wallet className="h-3.5 w-3.5" /> {t('pay.pay')}
                  </button>
                ),
              },
            ]}
          />
        ) : (
          <DataTable
            storageKey="pay-history"
            rows={payments.data}
            loading={payments.loading}
            searchText={(p) => [p.receipt_no, p.invoice_no, p.booking_no, p.customer_name, p.reference].join(' ')}
            filters={
              <>
                <FilterSelect value={customer} onChange={setCustomer} placeholder={t('pay.allCustomers')} options={(customers || []).map((c) => ({ value: c.id, label: c.name }))} />
                <FilterSelect value={method} onChange={setMethod} placeholder={t('pay.allMethods')} options={PAYMENT_METHODS.map((m) => ({ value: m, label: t(`pm.${m}`) }))} />
                <FilterSelect
                  value={status}
                  onChange={setStatus}
                  placeholder={t('common.allStatuses')}
                  options={[
                    { value: 'Valid', label: t('st.Valid') },
                    { value: 'Void', label: t('st.Void') },
                  ]}
                />
              </>
            }
            defaultSort={{ key: 'payment_date', dir: 'desc' }}
            onRowClick={(p) => nav(`/receipts/${p.id}`)}
            emptyTitle={t('pay.none')}
            footer={(list) => (
              <tr>
                <td className="td" colSpan={4}>
                  {t('common.total')} ({list.filter((p) => p.status === 'Valid').length})
                </td>
                <td className="td num text-right">{fmtRM(list.filter((p) => p.status === 'Valid').reduce((a, p) => a + p.amount, 0))}</td>
                <td className="td" colSpan={2} />
              </tr>
            )}
            columns={[
              { key: 'receipt_no', label: t('rec.no'), sort: (p) => p.id, render: (p) => <Link onClick={(e) => e.stopPropagation()} to={`/receipts/${p.id}`} className="font-medium text-brand-700 hover:underline">{p.receipt_no}</Link> },
              { key: 'payment_date', label: t('common.date'), render: (p) => fmtDate(p.payment_date) },
              {
                key: 'customer_name',
                label: t('cust.customer'),
                render: (p) => (
                  <div>
                    <div className="font-medium text-slate-800">{p.customer_name}</div>
                    <div className="text-xs text-slate-500">
                      {p.invoice_no} · {t(`pt.${p.payment_type}`)}
                    </div>
                  </div>
                ),
              },
              { key: 'method', label: t('pay.method'), render: (p) => <div>{t(`pm.${p.method}`)}{p.reference && <div className="text-xs text-slate-500">{p.reference}</div>}</div> },
              { key: 'amount', label: t('pay.amount'), align: 'right', render: (p) => <span className={p.status === 'Void' ? 'text-slate-400 line-through' : 'font-semibold text-emerald-700'}>{fmtRM(p.amount)}</span> },
              { key: 'status', label: t('common.status'), render: (p) => <StatusBadge status={p.status} /> },
              {
                key: 'void',
                label: '',
                sort: false,
                render: (p) =>
                  isAdmin && p.status === 'Valid' ? (
                    <button
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title={t('rec.void')}
                      onClick={(e) => {
                        e.stopPropagation();
                        voidPayment(p);
                      }}
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  ) : null,
              },
            ]}
          />
        )}
      </div>
      <RecordPaymentModal open={!!payFor} invoice={payFor} onClose={() => setPayFor(null)} onRecorded={(r) => (refresh(), nav(`/receipts/${r.payment.id}`))} />
      <RecordPaymentModal open={recordOpen} invoices={invoices.data || []} onClose={() => setRecordOpen(false)} onRecorded={(r) => (refresh(), nav(`/receipts/${r.payment.id}`))} />
    </div>
  );
}
