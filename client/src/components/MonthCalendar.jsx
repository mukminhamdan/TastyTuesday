import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { MONTHS, WEEKDAYS_SHORT, isoFromParts, lastDayOfMonth, todayISO, fmtTime } from '../lib/format.js';
import { statusTone } from './ui.jsx';

export const DOT = {
  slate: 'bg-slate-400',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  blue: 'bg-blue-600',
  teal: 'bg-teal-500',
  green: 'bg-green-600',
  emerald: 'bg-emerald-700',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
};
export const CHIP = {
  slate: 'bg-slate-100 text-slate-700 border-slate-300',
  amber: 'bg-amber-50 text-amber-800 border-amber-400',
  sky: 'bg-sky-50 text-sky-800 border-sky-400',
  violet: 'bg-violet-50 text-violet-800 border-violet-400',
  blue: 'bg-blue-50 text-blue-800 border-blue-500',
  teal: 'bg-teal-50 text-teal-800 border-teal-500',
  green: 'bg-green-50 text-green-800 border-green-500',
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-600',
  red: 'bg-red-50 text-red-700 border-red-400 line-through',
  orange: 'bg-orange-50 text-orange-800 border-orange-400',
};

/** Monday-first month grid. Each cell shows that day's bookings. */
export default function MonthCalendar({ year, month, bookings, onPrev, onNext, onToday, onDayClick, onBookingClick, compact = false, selected }) {
  const { t, lang } = useT();
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sun
  const lead = (first + 6) % 7;
  const days = lastDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(isoFromParts(year, month, d));
  while (cells.length % 7) cells.push(null);
  const today = todayISO();
  const byDate = {};
  for (const b of bookings || []) (byDate[b.event_date] = byDate[b.event_date] || []).push(b);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-800">
          {MONTHS[lang][month - 1]} {year}
        </h3>
        <div className="flex items-center gap-1">
          {onToday && (
            <button className="btn-secondary btn-sm" onClick={onToday}>
              {t('cal.today')}
            </button>
          )}
          <button className="btn-ghost btn-sm" onClick={onPrev} aria-label="previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="btn-ghost btn-sm" onClick={onNext} aria-label="next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-slate-200 bg-slate-200 gap-px">
        {WEEKDAYS_SHORT[lang].map((w) => (
          <div key={w} className="bg-slate-50 py-1.5 text-center text-[11px] font-semibold uppercase text-slate-500">
            {w}
          </div>
        ))}
        {cells.map((iso, i) => {
          const list = iso ? byDate[iso] || [] : [];
          const isToday = iso === today;
          return (
            <div
              key={i}
              className={`bg-white ${compact ? 'min-h-[52px] p-1' : 'min-h-[64px] p-1 sm:min-h-[104px] sm:p-1.5'} ${iso ? 'cursor-pointer hover:bg-brand-50/50' : 'bg-slate-50/60'} ${selected === iso ? 'ring-2 ring-inset ring-brand-500' : ''}`}
              onClick={() => iso && onDayClick?.(iso)}
            >
              {iso && (
                <>
                  <div className={`mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? 'bg-brand-700 font-bold text-white' : 'text-slate-600'}`}>{Number(iso.slice(8))}</div>
                  {compact ? (
                    <div className="flex flex-wrap gap-0.5">
                      {list.slice(0, 4).map((b) => (
                        <span key={b.id} className={`h-1.5 w-1.5 rounded-full ${DOT[statusTone(b.status)]}`} title={b.event_name} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {list.slice(0, 3).map((b) => (
                        <button
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookingClick?.(b);
                          }}
                          className={`block w-full truncate rounded border-l-2 px-1 py-0.5 text-left text-[10px] sm:text-[11px] ${CHIP[statusTone(b.status)]}`}
                          title={`${b.event_name} - ${b.customer_name}`}
                        >
                          <span className="hidden sm:inline">{b.start_time ? fmtTime(b.start_time) + ' ' : ''}</span>
                          {b.event_name}
                        </button>
                      ))}
                      {list.length > 3 && <div className="px-1 text-[10px] text-slate-500">+{list.length - 3}</div>}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
