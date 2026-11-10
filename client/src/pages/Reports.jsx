import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, Sheet, Printer, CalendarRange, CalendarDays, TrendingUp, Users, AlertCircle, Wallet, Star, XCircle } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useFetch, useSettings, useToast } from '../lib/context.jsx';
import { qs } from '../lib/api.js';
import { PageHeader, Card, StatCard, Loading, ErrorState, EmptyState, StatusBadge } from '../components/ui.jsx';
import { DateRangeFilter, initialRange } from '../components/forms.jsx';
import Chart, { SERIES } from '../components/Chart.jsx';
import { fmtRM, fmtDate, fmtPeriod, fmtDateTime } from '../lib/format.js';
import { downloadReportPdf, printReportPdf } from '../lib/pdf.js';
import { exportExcel } from '../lib/excel.js';

const REPORTS = [
  { key: 'bookings-monthly', icon: CalendarDays },
  { key: 'bookings-annual', icon: CalendarRange },
  { key: 'revenue', icon: TrendingUp },
  { key: 'customers', icon: Users },
  { key: 'outstanding', icon: AlertCircle },
  { key: 'collections', icon: Wallet },
  { key: 'services', icon: Star },
  { key: 'cancelled', icon: XCircle },
];

/** Column definitions per report: { label, value(row) -> raw, fmt?(raw) -> string, type } */
function defs(type, t, lang) {
  const money = (key, label) => ({ label, raw: (r) => r[key], text: (r) => fmtRM(r[key]), type: 'money', align: 'right' });
  const num = (key, label) => ({ label, raw: (r) => r[key], text: (r) => String(r[key] ?? 0), type: 'number', align: 'right' });
  const txt = (label, fn) => ({ label, raw: fn, text: (r) => String(fn(r) ?? '-'), type: 'text' });
  switch (type) {
    case 'bookings-monthly':
    case 'bookings-annual':
      return [
        txt(t('reports.period'), (r) => fmtPeriod(r.period, lang)),
        num('total', t('reports.totalBookings')),
        num('confirmed', t('reports.confirmed')),
        num('completed', t('st.Completed')),
        num('cancelled', t('st.Cancelled')),
        money('value', t('reports.invoicedValue')),
      ];
    case 'revenue':
      return [txt(t('reports.period'), (r) => fmtPeriod(r.period, lang)), num('invoice_count', t('nav.invoices')), money('discount', t('doc.discount')), money('tax', t('doc.tax')), money('invoiced', t('dash.invoiced')), money('collected', t('dash.collected'))];
    case 'customers':
      return [
        txt(t('cust.id'), (r) => r.customer_no),
        txt(t('cust.name'), (r) => r.name),
        txt(t('cust.category'), (r) => r.category || '-'),
        num('bookings', t('nav.bookings')),
        num('quotations', t('nav.quotations')),
        money('invoiced', t('cust.invoiced')),
        money('paid', t('cust.paid')),
        money('outstanding', t('cust.outstanding')),
      ];
    case 'outstanding':
      return [
        txt(t('inv.no'), (r) => r.invoice_no),
        txt(t('cust.customer'), (r) => r.customer_name),
        txt(t('common.date'), (r) => fmtDate(r.invoice_date)),
        txt(t('inv.dueDate'), (r) => fmtDate(r.due_date)),
        num('days_overdue', t('reports.daysOverdue')),
        money('total', t('common.total')),
        money('amount_paid', t('inv.paid')),
        money('balance', t('inv.balance')),
      ];
    case 'collections':
      return [
        txt(t('rec.no'), (r) => r.receipt_no),
        txt(t('common.date'), (r) => fmtDate(r.payment_date)),
        txt(t('cust.customer'), (r) => r.customer_name),
        txt(t('inv.invoice'), (r) => r.invoice_no),
        txt(t('pay.type'), (r) => t(`pt.${r.payment_type}`)),
        txt(t('pay.method'), (r) => t(`pm.${r.method}`)),
        txt(t('pay.reference'), (r) => r.reference || '-'),
        money('amount', t('pay.amount')),
      ];
    case 'services':
      return [
        txt(t('reports.service'), (r) => r.service),
        num('quoted', t('reports.timesQuoted')),
        num('approved', t('reports.timesApproved')),
        num('invoices', t('reports.timesInvoiced')),
        num('quantity', t('items.qty')),
        money('avg_price', t('reports.avgPrice')),
        money('revenue', t('reports.revenue')),
      ];
    case 'cancelled':
      return [
        txt(t('book.no'), (r) => r.booking_no),
        txt(t('book.event'), (r) => r.event_name),
        txt(t('cust.customer'), (r) => r.customer_name),
        txt(t('book.date'), (r) => fmtDate(r.event_date)),
        txt(t('book.cancelReason'), (r) => r.cancel_reason || '-'),
        money('quoted', t('reports.quotedValue')),
        money('paid', t('reports.paidBeforeCancel')),
      ];
    default:
      return [];
  }
}

function summaryCards(type, d, t) {
  const s = d.summary;
  switch (type) {
    case 'bookings-monthly':
    case 'bookings-annual':
      return [
        [t('reports.totalBookings'), s.total],
        [t('reports.confirmed'), s.confirmed],
        [t('st.Completed'), s.completed],
        [t('reports.invoicedValue'), fmtRM(s.value)],
      ];
    case 'revenue':
      return [
        [t('dash.invoiced'), fmtRM(s.invoiced)],
        [t('dash.collected'), fmtRM(s.collected)],
        [t('doc.tax'), fmtRM(s.tax)],
        [t('reports.collectionRate'), s.invoiced ? `${Math.round((s.collected / s.invoiced) * 100)}%` : '-'],
      ];
    case 'customers':
      return [
        [t('reports.activeCustomers'), `${s.customers} / ${s.total_customers}`],
        [t('cust.invoiced'), fmtRM(s.invoiced)],
        [t('cust.paid'), fmtRM(s.paid)],
        [t('cust.outstanding'), fmtRM(s.outstanding)],
      ];
    case 'outstanding':
      return [
        [t('reports.openInvoices'), s.count],
        [t('common.total'), fmtRM(s.total)],
        [t('inv.paid'), fmtRM(s.amount_paid)],
        [t('reports.totalOutstanding'), fmtRM(s.balance)],
      ];
    case 'collections':
      return [
        [t('reports.payments'), s.count],
        [t('reports.totalCollected'), fmtRM(s.amount)],
        [t('pay.depositsReceived'), fmtRM(s.deposits)],
        [t('reports.average'), s.count ? fmtRM(Math.round(s.amount / s.count)) : '-'],
      ];
    case 'services':
      return [
        [t('reports.services'), d.rows.length],
        [t('reports.revenue'), fmtRM(s.revenue)],
        [t('reports.timesQuoted'), s.quoted],
        [t('reports.timesInvoiced'), s.invoices],
      ];
    case 'cancelled':
      return [
        [t('reports.cancelledBookings'), s.count],
        [t('reports.cancellationRate'), `${s.rate}%`],
        [t('reports.quotedValue'), fmtRM(s.quoted)],
        [t('reports.paidBeforeCancel'), fmtRM(s.paid)],
      ];
    default:
      return [];
  }
}

function chartFor(type, d, t, lang) {
  const labelsP = (rows) => rows.map((r) => fmtPeriod(r.period, lang));
  switch (type) {
    case 'bookings-monthly':
    case 'bookings-annual':
      return {
        labels: labelsP(d.rows),
        datasets: [
          { label: t('reports.confirmed'), data: d.rows.map((r) => r.confirmed), color: SERIES[0] },
          { label: t('reports.notConfirmed'), data: d.rows.map((r) => r.total - r.confirmed - r.cancelled), color: SERIES[2] },
          { label: t('st.Cancelled'), data: d.rows.map((r) => r.cancelled), color: SERIES[1] },
        ],
        stacked: true,
      };
    case 'revenue':
      return {
        labels: labelsP(d.rows),
        datasets: [
          { label: t('dash.invoiced'), data: d.rows.map((r) => r.invoiced), color: SERIES[0] },
          { label: t('dash.collected'), data: d.rows.map((r) => r.collected), color: SERIES[1] },
        ],
        money: true,
      };
    case 'customers': {
      const top = d.rows.filter((r) => r.invoiced > 0).slice(0, 10);
      return { labels: top.map((r) => r.name), datasets: [{ label: t('cust.invoiced'), data: top.map((r) => r.invoiced) }], money: true, horizontal: true };
    }
    case 'outstanding':
      return { labels: d.buckets.map((b) => t(`aging.${b.bucket}`)), datasets: [{ label: t('inv.balance'), data: d.buckets.map((b) => b.amount) }], money: true };
    case 'collections':
      return {
        labels: labelsP(d.monthly),
        datasets: [{ label: t('reports.totalCollected'), data: d.monthly.map((m) => m.amount) }],
        money: true,
        side: { labels: d.by_method.map((m) => t(`pm.${m.method}`)), datasets: [{ label: t('pay.amount'), data: d.by_method.map((m) => m.amount) }] },
      };
    case 'services': {
      const top = d.rows.filter((r) => r.revenue > 0).slice(0, 10);
      return { labels: top.map((r) => r.service), datasets: [{ label: t('reports.revenue'), data: top.map((r) => r.revenue) }], money: true, horizontal: true };
    }
    default:
      return null;
  }
}

export default function Reports() {
  const { t, lang } = useT();
  const nav = useNavigate();
  const toast = useToast();
  const { settings } = useSettings();
  const [type, setType] = useState('revenue');
  const [range, setRange] = useState(() => initialRange('thisYear'));
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useFetch(`/reports/${type}${qs({ from: range.from, to: range.to })}`);

  const columns = useMemo(() => defs(type, t, lang), [type, t, lang]);
  const chart = useMemo(() => (data && data.type === type ? chartFor(type, data, t, lang) : null), [data, type, t, lang]);
  const title = t(`reports.${type}`);
  const period = `${fmtDate(range.from)} - ${fmtDate(range.to)}`;
  const ready = data && data.type === type;
  // Totals row computed from rows (money & counts)
  const footer = ready && data.rows.length
    ? columns.map((c, i) => {
        if (i === 0) return t('common.total');
        if (c.type === 'money') return fmtRM(data.rows.reduce((s, r) => s + (Number(c.raw(r)) || 0), 0));
        if (c.type === 'number' && c.label !== t('reports.daysOverdue')) return String(data.rows.reduce((s, r) => s + (Number(c.raw(r)) || 0), 0));
        return '';
      })
    : null;

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  const pdfOpts = () => ({
    title,
    period,
    settings,
    lang,
    columns: columns.map((c) => ({ label: c.label, value: c.text, align: c.align })),
    rows: data.rows,
    summary: summaryCards(type, data, t),
    totalsRow: footer,
  });
  const exportXlsx = () =>
    run(() =>
      exportExcel({
        filename: `${type}-${range.from}-${range.to}.xlsx`,
        sheetName: title,
        title,
        period,
        businessName: settings.business_name,
        columns: columns.map((c) => ({ label: c.label, value: c.type === 'text' ? c.text : c.raw, type: c.type })),
        rows: data.rows,
        summary: summaryCards(type, data, t),
        totalsRow: columns.map((c, i) => (i === 0 ? t('common.total') : c.type === 'money' || (c.type === 'number' && c.label !== t('reports.daysOverdue')) ? 'SUM' : '')),
      }),
    );

  const rowLink = (r) => {
    if (type === 'customers') return `/customers/${r.id}`;
    if (type === 'outstanding') return `/invoices/${r.id}`;
    if (type === 'collections') return `/receipts/${r.id}`;
    if (type === 'cancelled') return `/bookings/${r.id}`;
    return null;
  };

  return (
    <div>
      <PageHeader title={t('nav.reports')} subtitle={t('reports.subtitle')} />
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => setType(r.key)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium transition ${type === r.key ? 'border-brand-600 bg-brand-700 text-white shadow' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'}`}
          >
            <r.icon className="h-5 w-5" />
            {t(`reports.${r.key}`)}
          </button>
        ))}
      </div>
      <div className="card card-pad mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">
            {period}
            {type === 'outstanding' && ` · ${t('reports.outstandingNote')}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} presets={['thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'month', 'year', 'all', 'custom']} />
          <button className="btn-secondary" disabled={!ready || busy} onClick={() => run(() => downloadReportPdf(pdfOpts(), `${type}-${range.from}-${range.to}.pdf`))}>
            <FileDown className="h-4 w-4" /> PDF
          </button>
          <button className="btn-secondary" disabled={!ready || busy} onClick={exportXlsx}>
            <Sheet className="h-4 w-4" /> Excel
          </button>
          <button className="btn-secondary" disabled={!ready || busy} onClick={() => run(() => printReportPdf(pdfOpts()))}>
            <Printer className="h-4 w-4" /> {t('common.print')}
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !ready || loading ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards(type, data, t).map(([l, v]) => (
              <StatCard key={l} label={l} value={v} />
            ))}
          </div>
          {chart && chart.labels.length > 0 && (
            <div className={`mt-5 grid gap-5 ${chart.side ? 'xl:grid-cols-3' : ''}`}>
              <Card title={t('reports.chart')} className={chart.side ? 'xl:col-span-2' : ''}>
                <Chart labels={chart.labels} datasets={chart.datasets} money={chart.money} stacked={chart.stacked} horizontal={chart.horizontal} height={chart.horizontal ? Math.max(200, chart.labels.length * 34) : 280} />
              </Card>
              {chart.side && (
                <Card title={t('reports.byMethod')}>
                  {chart.side.labels.length ? <Chart labels={chart.side.labels} datasets={chart.side.datasets} money horizontal height={Math.max(180, chart.side.labels.length * 40)} /> : <EmptyState title={t('common.noRecords')} />}
                </Card>
              )}
            </div>
          )}
          {type === 'outstanding' && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {data.buckets.map((b) => (
                <div key={b.bucket} className={`card card-pad text-center ${b.bucket !== 'current' && b.amount > 0 ? 'border-red-200 bg-red-50/40' : ''}`}>
                  <div className="text-xs text-slate-500">{t(`aging.${b.bucket}`)}</div>
                  <div className="num text-base font-bold">{fmtRM(b.amount)}</div>
                  <div className="text-xs text-slate-400">{t('pay.nInvoices', { n: b.count })}</div>
                </div>
              ))}
            </div>
          )}
          <Card className="mt-5" pad={false} title={`${t('reports.details')} (${data.rows.length})`} actions={<span className="text-xs text-slate-400">{t('reports.generated')}: {fmtDateTime(data.generated_at)}</span>}>
            {data.rows.length === 0 ? (
              <EmptyState title={t('reports.noData')} message={t('reports.noDataMsg')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      {columns.map((c) => (
                        <th key={c.label} className={`th ${c.align === 'right' ? 'text-right' : ''}`}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.rows.map((r, i) => {
                      const link = rowLink(r);
                      return (
                        <tr key={r.id ?? r.period ?? r.service ?? i} className={link ? 'cursor-pointer hover:bg-brand-50/40' : ''} onClick={link ? () => nav(link) : undefined}>
                          {columns.map((c) => (
                            <td key={c.label} className={`td ${c.align === 'right' ? 'num text-right' : ''}`}>
                              {c.text(r)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                  {footer && (
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                      <tr>
                        {footer.map((v, i) => (
                          <td key={i} className={`td font-semibold ${columns[i].align === 'right' ? 'num text-right' : ''}`}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </Card>
          {type === 'bookings-monthly' && data.details?.length > 0 && (
            <Card className="mt-5" pad={false} title={t('reports.bookingList')}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="th">{t('book.no')}</th>
                      <th className="th">{t('book.date')}</th>
                      <th className="th">{t('book.event')}</th>
                      <th className="th">{t('cust.customer')}</th>
                      <th className="th">{t('common.status')}</th>
                      <th className="th text-right">{t('reports.invoicedValue')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.details.map((b) => (
                      <tr key={b.id} className="cursor-pointer hover:bg-brand-50/40" onClick={() => nav(`/bookings/${b.id}`)}>
                        <td className="td font-medium text-brand-700">{b.booking_no}</td>
                        <td className="td">{fmtDate(b.event_date)}</td>
                        <td className="td">{b.event_name}</td>
                        <td className="td">{b.customer_name}</td>
                        <td className="td">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="td num text-right">{fmtRM(b.invoiced)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
