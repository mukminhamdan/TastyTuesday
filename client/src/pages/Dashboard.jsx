import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, CalendarClock, FileClock, FileCheck2, FileSpreadsheet, AlertCircle, TrendingUp, Wallet, Clock, BellRing, Activity } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useFetch } from '../lib/context.jsx';
import { qs } from '../lib/api.js';
import { PageHeader, Card, StatCard, StatusBadge, Loading, ErrorState, EmptyState } from '../components/ui.jsx';
import { DateRangeFilter, initialRange } from '../components/forms.jsx';
import Chart, { SERIES } from '../components/Chart.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import { fmtRM, fmtDate, fmtDateTime, fmtTimeRange, MONTHS_SHORT, isoFromParts, lastDayOfMonth, todayISO, whatsappLink } from '../lib/format.js';

export default function Dashboard() {
  const { t, lang } = useT();
  const nav = useNavigate();
  const [range, setRange] = useState(() => initialRange('thisMonth'));
  const { data, error, loading, reload } = useFetch(`/dashboard${qs({ from: range.from, to: range.to, year: range.preset === 'year' || range.preset === 'month' ? range.year : undefined })}`);
  const today = todayISO();
  const [cal, setCal] = useState({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) });
  const calRange = `/bookings${qs({ from: isoFromParts(cal.y, cal.m, 1), to: isoFromParts(cal.y, cal.m, lastDayOfMonth(cal.y, cal.m)) })}`;
  const { data: calBookings } = useFetch(calRange);

  const chartData = useMemo(() => {
    if (!data) return null;
    return {
      labels: MONTHS_SHORT[lang],
      datasets: [
        { label: t('dash.invoiced'), data: data.monthly.map((m) => m.invoiced), color: SERIES[0] },
        { label: t('dash.collected'), data: data.monthly.map((m) => m.collected), color: SERIES[1] },
      ],
    };
  }, [data, lang, t]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  const s = data?.stats;

  return (
    <div>
      <PageHeader
        title={t('nav.dashboard')}
        subtitle={t('dash.subtitle')}
        actions={<DateRangeFilter value={range} onChange={setRange} presets={['today', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'month', 'year', 'custom']} years={data?.years} />}
      />
      {!data && loading ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ClipboardList} label={t('dash.totalBookings')} value={s.total_bookings} hint={t('dash.inPeriod')} onClick={() => nav('/bookings')} />
            <StatCard icon={CalendarClock} tone="violet" label={t('dash.upcomingBookings')} value={s.upcoming_bookings} hint={t('dash.fromToday')} onClick={() => nav('/calendar')} />
            <StatCard icon={FileClock} tone="amber" label={t('dash.pendingQuotations')} value={s.pending_quotations} hint={fmtRM(s.pending_quotations_value)} onClick={() => nav('/quotations')} />
            <StatCard icon={FileCheck2} tone="green" label={t('dash.approvedQuotations')} value={s.approved_quotations} hint={fmtRM(s.approved_quotations_value)} onClick={() => nav('/quotations')} />
            <StatCard icon={FileSpreadsheet} tone="slate" label={t('dash.totalInvoices')} value={s.total_invoices} hint={t('dash.inPeriod')} onClick={() => nav('/invoices')} />
            <StatCard icon={AlertCircle} tone="red" label={t('dash.outstanding')} value={fmtRM(s.outstanding)} hint={s.overdue ? `${t('st.Overdue')}: ${fmtRM(s.overdue)}` : t('dash.allOpen')} onClick={() => nav('/payments')} />
            <StatCard icon={TrendingUp} label={t('dash.totalRevenue')} value={fmtRM(s.total_revenue)} hint={t('dash.invoicedInPeriod')} onClick={() => nav('/reports')} />
            <StatCard icon={Wallet} tone="green" label={t('dash.paymentsReceived')} value={fmtRM(s.payments_received)} hint={t('dash.inPeriod')} onClick={() => nav('/receipts')} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-5">
            <Card title={`${t('dash.monthlyRevenue')} ${data.year}`} className="xl:col-span-3">
              <Chart labels={chartData.labels} datasets={chartData.datasets} money height={280} />
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-xs text-slate-500">{t('common.viewTable')}</summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="py-1 text-left">{t('reports.period')}</th>
                        <th className="py-1 text-right">{t('dash.invoiced')}</th>
                        <th className="py-1 text-right">{t('dash.collected')}</th>
                        <th className="py-1 text-right">{t('nav.bookings')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly.map((m) => (
                        <tr key={m.month} className="border-t border-slate-100">
                          <td className="py-1">{MONTHS_SHORT[lang][m.month - 1]}</td>
                          <td className="num py-1 text-right">{fmtRM(m.invoiced)}</td>
                          <td className="num py-1 text-right">{fmtRM(m.collected)}</td>
                          <td className="num py-1 text-right">{m.bookings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </Card>
            <Card title={t('dash.bookingCalendar')} className="xl:col-span-2" actions={<Link to="/calendar" className="text-xs font-medium text-brand-700 hover:underline">{t('common.viewAll')}</Link>}>
              <MonthCalendar
                compact
                year={cal.y}
                month={cal.m}
                bookings={calBookings}
                onPrev={() => setCal((c) => (c.m === 1 ? { y: c.y - 1, m: 12 } : { ...c, m: c.m - 1 }))}
                onNext={() => setCal((c) => (c.m === 12 ? { y: c.y + 1, m: 1 } : { ...c, m: c.m + 1 }))}
                onDayClick={(iso) => nav(`/calendar?view=day&date=${iso}`)}
              />
            </Card>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <Card title={<span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-violet-600" />{t('dash.upcomingEvents')}</span>} pad={false}>
              {data.upcoming.length === 0 ? (
                <EmptyState title={t('dash.noUpcoming')} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.upcoming.map((b) => (
                    <li key={b.id}>
                      <Link to={`/bookings/${b.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                        <div className="w-12 shrink-0 rounded-lg bg-brand-50 py-1 text-center">
                          <div className="text-lg font-bold leading-tight text-brand-800">{b.event_date.slice(8)}</div>
                          <div className="text-[10px] uppercase text-brand-700">{MONTHS_SHORT[lang][Number(b.event_date.slice(5, 7)) - 1]}</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-800">{b.event_name}</div>
                          <div className="truncate text-xs text-slate-500">
                            {b.customer_name} {b.start_time && `· ${fmtTimeRange(b.start_time, b.end_time)}`}
                          </div>
                          {b.venue && <div className="truncate text-xs text-slate-400">{b.venue}</div>}
                        </div>
                        <StatusBadge status={b.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title={<span className="inline-flex items-center gap-2"><BellRing className="h-4 w-4 text-red-600" />{t('dash.paymentReminders')}</span>} pad={false}>
              {data.reminders.length === 0 && data.expiring.length === 0 ? (
                <EmptyState title={t('dash.noReminders')} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.reminders.map((r) => {
                    const overdue = r.due_date < today;
                    return (
                      <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <Link to={`/invoices/${r.id}`} className="text-sm font-medium text-slate-800 hover:text-brand-700">
                            {r.invoice_no} · {r.customer_name}
                          </Link>
                          <div className={`text-xs ${overdue ? 'font-medium text-red-600' : 'text-amber-700'}`}>
                            {overdue ? t('dash.overdueSince', { date: fmtDate(r.due_date) }) : r.due_date === today ? t('dash.dueToday') : t('dash.dueOn', { date: fmtDate(r.due_date) })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="num text-sm font-semibold text-slate-800">{fmtRM(r.balance)}</div>
                          {r.customer_phone && (
                            <a
                              className="text-xs text-emerald-700 hover:underline"
                              target="_blank"
                              rel="noreferrer"
                              href={whatsappLink(r.customer_phone, t('dash.reminderMsg', { no: r.invoice_no, amount: fmtRM(r.balance), date: fmtDate(r.due_date) }))}
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {data.expiring.map((q) => (
                    <li key={`q${q.id}`} className="flex items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <Link to={`/quotations/${q.id}`} className="text-sm font-medium text-slate-800 hover:text-brand-700">
                          {q.quotation_no} · {q.customer_name}
                        </Link>
                        <div className="text-xs text-orange-700">{t('dash.quoteExpires', { date: fmtDate(q.valid_until) })}</div>
                      </div>
                      <div className="num text-sm font-semibold text-slate-800">{fmtRM(q.total)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title={<span className="inline-flex items-center gap-2"><Activity className="h-4 w-4 text-brand-600" />{t('dash.recentActivity')}</span>} pad={false} className="lg:col-span-2 xl:col-span-1">
              {data.activity.length === 0 ? (
                <EmptyState title={t('dash.noActivity')} />
              ) : (
                <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                  {data.activity.map((a) => (
                    <li key={a.id} className="px-4 py-2.5">
                      <div className="text-sm text-slate-700">
                        {a.ref_no && <ActivityLink a={a} />} {a.description}
                      </div>
                      <div className="text-xs text-slate-400">
                        {fmtDateTime(a.created_at)} {a.customer_name && `· ${a.customer_name}`} {a.user_name && `· ${a.user_name}`}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function ActivityLink({ a }) {
  const base = { customer: '/customers/', booking: '/bookings/', quotation: '/quotations/', invoice: '/invoices/', payment: '/receipts/' }[a.entity_type];
  if (!base || a.action === 'deleted') return <span className="font-medium">{a.ref_no}</span>;
  return (
    <Link to={base + a.entity_id} className="font-medium text-brand-700 hover:underline">
      {a.ref_no}
    </Link>
  );
}

