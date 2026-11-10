import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useFetch } from '../lib/context.jsx';
import { qs } from '../lib/api.js';
import { PageHeader, StatusBadge, statusTone, Card } from '../components/ui.jsx';
import MonthCalendar, { CHIP, DOT } from '../components/MonthCalendar.jsx';
import { BOOKING_STATUSES } from '@shared/constants.js';
import { addDays, fmtDate, fmtTime, fmtTimeRange, isoFromParts, lastDayOfMonth, todayISO, MONTHS, WEEKDAYS_SHORT } from '../lib/format.js';

/** Monday of the week containing iso. */
function weekStart(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const dow = (d.getUTCDay() + 6) % 7;
  return addDays(iso, -dow);
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 - 23:00

export default function CalendarPage() {
  const { t, lang } = useT();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'month';
  const date = params.get('date') || todayISO();
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));

  const range = useMemo(() => {
    if (view === 'month') return { from: isoFromParts(y, m, 1), to: isoFromParts(y, m, lastDayOfMonth(y, m)) };
    if (view === 'week') {
      const s = weekStart(date);
      return { from: s, to: addDays(s, 6) };
    }
    return { from: date, to: date };
  }, [view, date, y, m]);
  const { data: bookings } = useFetch(`/bookings${qs(range)}`);

  const go = (patch) => setParams({ view, date, ...patch });
  const step = (dir) => {
    if (view === 'month') {
      const nm = m + dir;
      const ny = nm < 1 ? y - 1 : nm > 12 ? y + 1 : y;
      go({ date: isoFromParts(ny, ((nm + 11) % 12) + 1, 1) });
    } else go({ date: addDays(date, dir * (view === 'week' ? 7 : 1)) });
  };

  const title =
    view === 'month'
      ? `${MONTHS[lang][m - 1]} ${y}`
      : view === 'week'
        ? `${fmtDate(range.from)} - ${fmtDate(range.to)}`
        : `${WEEKDAYS_SHORT[lang][(new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7]}, ${fmtDate(date)}`;

  return (
    <div>
      <PageHeader
        title={t('nav.calendar')}
        subtitle={t('cal.subtitle')}
        actions={
          <Link to={`/bookings/new?date=${view === 'day' ? date : ''}`} className="btn-primary">
            <Plus className="h-4 w-4" /> {t('book.new')}
          </Link>
        }
      />
      <div className="card card-pad">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button className="btn-secondary btn-sm" onClick={() => go({ date: todayISO() })}>
              {t('cal.today')}
            </button>
            <button className="btn-ghost btn-sm" onClick={() => step(-1)} aria-label="previous">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-ghost btn-sm" onClick={() => step(1)} aria-label="next">
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className="ml-1 text-base font-semibold text-slate-800">{title}</h2>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
            {['month', 'week', 'day'].map((v) => (
              <button key={v} onClick={() => setParams({ view: v, date })} className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === v ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {t(`cal.${v}`)}
              </button>
            ))}
          </div>
        </div>

        {view === 'month' && (
          <div className="[&>div>div:first-child]:hidden">
            <MonthCalendar year={y} month={m} bookings={bookings} onPrev={() => step(-1)} onNext={() => step(1)} onDayClick={(iso) => setParams({ view: 'day', date: iso })} onBookingClick={(b) => nav(`/bookings/${b.id}`)} />
          </div>
        )}
        {view === 'week' && <WeekView start={range.from} bookings={bookings || []} onDay={(iso) => setParams({ view: 'day', date: iso })} />}
        {view === 'day' && <DayView date={date} bookings={bookings || []} />}

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3">
          {BOOKING_STATUSES.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-full ${DOT[statusTone(s)]}`} /> {t(`st.${s}`)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekView({ start, bookings, onDay }) {
  const { lang } = useT();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = todayISO();
  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((d, i) => {
        const list = bookings.filter((b) => b.event_date === d).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
        return (
          <div key={d} className={`min-h-[120px] rounded-lg border p-2 ${d === today ? 'border-brand-400 bg-brand-50/40' : 'border-slate-200'}`}>
            <button className="mb-2 flex w-full items-baseline justify-between text-left" onClick={() => onDay(d)}>
              <span className="text-xs font-semibold uppercase text-slate-500">{WEEKDAYS_SHORT[lang][i]}</span>
              <span className={`text-sm font-bold ${d === today ? 'text-brand-700' : 'text-slate-700'}`}>{fmtDate(d).slice(0, 5)}</span>
            </button>
            <div className="space-y-1.5">
              {list.map((b) => (
                <Link key={b.id} to={`/bookings/${b.id}`} className={`block rounded border-l-4 px-2 py-1.5 text-xs ${CHIP[statusTone(b.status)]}`}>
                  <div className="font-semibold">{b.start_time ? fmtTime(b.start_time) : '-'}</div>
                  <div className="truncate">{b.event_name}</div>
                  <div className="truncate opacity-75">{b.customer_name}</div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ date, bookings }) {
  const { t } = useT();
  const list = bookings.filter((b) => b.event_date === date).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  const allDay = list.filter((b) => !b.start_time);
  const timed = list.filter((b) => b.start_time);
  const toMin = (hm) => {
    const [h, mm] = hm.split(':').map(Number);
    return h * 60 + mm;
  };
  const startMin = HOURS[0] * 60;
  const PX = 48; // per hour
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {allDay.length > 0 && (
          <div className="mb-2 space-y-1">
            {allDay.map((b) => (
              <Link key={b.id} to={`/bookings/${b.id}`} className={`block rounded border-l-4 px-2 py-1 text-xs ${CHIP[statusTone(b.status)]}`}>
                {t('book.allDay')} · {b.event_name}
              </Link>
            ))}
          </div>
        )}
        <div className="relative rounded-lg border border-slate-200" style={{ height: HOURS.length * PX }}>
          {HOURS.map((h, i) => (
            <div key={h} className="absolute inset-x-0 border-t border-slate-100 text-[11px] text-slate-400" style={{ top: i * PX }}>
              <span className="bg-white px-1">{fmtTime(`${String(h).padStart(2, '0')}:00`)}</span>
            </div>
          ))}
          {timed.map((b, idx) => {
            const s = Math.max(toMin(b.start_time), startMin);
            const e = b.end_time ? toMin(b.end_time) : s + 60;
            const overlapping = timed.filter((o) => o.id !== b.id && toMin(o.start_time) < e && (o.end_time ? toMin(o.end_time) : toMin(o.start_time) + 60) > s);
            const col = overlapping.length ? timed.filter((o, j) => j < idx && overlapping.includes(o)).length : 0;
            const cols = overlapping.length + 1;
            return (
              <Link
                key={b.id}
                to={`/bookings/${b.id}`}
                className={`absolute overflow-hidden rounded border-l-4 px-2 py-1 text-xs shadow-sm ${CHIP[statusTone(b.status)]}`}
                style={{ top: ((s - startMin) / 60) * PX + 1, height: Math.max(((e - s) / 60) * PX - 2, 24), left: `calc(64px + (100% - 72px) * ${col / cols})`, width: `calc((100% - 72px) / ${cols})` }}
              >
                <div className="font-semibold">
                  {fmtTimeRange(b.start_time, b.end_time)} · {b.event_name}
                </div>
                <div className="truncate opacity-80">{b.customer_name}</div>
              </Link>
            );
          })}
        </div>
      </div>
      <Card title={t('cal.dayList', { n: list.length })} pad={false}>
        {list.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            {t('cal.noBookings')}
            <div className="mt-3">
              <Link to={`/bookings/new?date=${date}`} className="btn-primary btn-sm">
                <Plus className="h-4 w-4" /> {t('book.new')}
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((b) => (
              <li key={b.id}>
                <Link to={`/bookings/${b.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-slate-800">{b.event_name}</div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="text-xs text-slate-500">
                    {b.booking_no} · {b.customer_name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {fmtTimeRange(b.start_time, b.end_time) || t('book.allDay')}
                    </span>
                    {b.venue && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {b.venue}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
