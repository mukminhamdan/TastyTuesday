import { useEffect, useId, useRef, useState } from 'react';
import { X, Loader2, AlertTriangle, Inbox, CalendarDays, Search } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { fmtDate, parseDMY } from '../lib/format.js';
import { rmToSen } from '@shared/calc.js';

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {back}
        <h1 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = '', pad = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'card-pad' : ''}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'brand', onClick }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    violet: 'bg-violet-50 text-violet-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick} className={`card card-pad flex items-start gap-3 text-left ${onClick ? 'transition hover:border-brand-300 hover:shadow' : ''}`}>
      {Icon && (
        <span className={`rounded-lg p-2.5 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="num mt-1 truncate text-xl font-bold text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
    </Comp>
  );
}

const STATUS_TONE = {
  // booking
  'New Enquiry': 'slate',
  'Pending Quotation': 'amber',
  'Quotation Sent': 'sky',
  'Awaiting Confirmation': 'violet',
  Confirmed: 'blue',
  'Deposit Paid': 'teal',
  'Fully Paid': 'green',
  Completed: 'emerald',
  Cancelled: 'red',
  // quotation
  Draft: 'slate',
  Sent: 'sky',
  Viewed: 'violet',
  Approved: 'green',
  Rejected: 'red',
  Expired: 'orange',
  // invoice
  'Partially Paid': 'amber',
  Paid: 'green',
  Overdue: 'red',
  // payment
  Valid: 'green',
  Void: 'red',
};
const TONE_CLASS = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
  green: 'bg-green-50 text-green-700 ring-green-200',
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  red: 'bg-red-50 text-red-700 ring-red-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
};
export const statusTone = (s) => STATUS_TONE[s] || 'slate';

export function StatusBadge({ status, className = '' }) {
  const { t } = useT();
  if (!status) return null;
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASS[statusTone(status)]} ${className}`}>
      {t(`st.${status}`)}
    </span>
  );
}

export function Badge({ children, tone = 'slate' }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASS[tone]}`}>{children}</span>;
}

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin text-brand-600 ${className}`} />;
}

export function Loading() {
  const { t } = useT();
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Spinner /> {t('common.loading')}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const { t } = useT();
  return (
    <div className="card card-pad flex flex-col items-center gap-3 py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-amber-500" />
      <p className="text-sm text-slate-600">{error?.message || t('common.error')}</p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Inbox className="h-9 w-9 text-slate-300" />
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {message && <p className="max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Field({ label, error, hint, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' };
  return (
    <div className="no-print fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-xl ${widths[size]}`} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="no-print -mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${
            value === tab.value ? 'border-brand-700 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Money input: displays RM, value is integer sen. */
export function MoneyInput({ value, onChange, className = '', invalid, ...rest }) {
  const [text, setText] = useState(value ? (value / 100).toFixed(2) : '');
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value ? (value / 100).toFixed(2) : '');
  }, [value]);
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-400">RM</span>
      <input
        {...rest}
        inputMode="decimal"
        className={`input num pl-10 text-right ${invalid ? 'input-error' : ''}`}
        value={text}
        placeholder="0.00"
        onFocus={() => (focused.current = true)}
        onChange={(e) => {
          setText(e.target.value);
          const s = rmToSen(e.target.value);
          if (!Number.isNaN(s)) onChange(Math.max(0, s));
        }}
        onBlur={() => {
          focused.current = false;
          const s = rmToSen(text);
          setText(!Number.isNaN(s) && s ? (s / 100).toFixed(2) : '');
          if (Number.isNaN(s)) onChange(0);
        }}
      />
    </div>
  );
}

/** Date input that always displays DD/MM/YYYY; value is ISO YYYY-MM-DD. */
export function DateInput({ value, onChange, invalid, className = '', required, min, ...rest }) {
  const [text, setText] = useState(fmtDate(value) === '-' ? '' : fmtDate(value));
  const picker = useRef(null);
  const id = useId();
  useEffect(() => {
    setText(value ? fmtDate(value) : '');
  }, [value]);
  const commit = (s) => {
    if (!s.trim()) return onChange('');
    const iso = parseDMY(s);
    if (iso) onChange(iso);
    else setText(value ? fmtDate(value) : '');
  };
  return (
    <div className={`relative ${className}`}>
      <input
        {...rest}
        id={id}
        className={`input pr-10 ${invalid ? 'input-error' : ''}`}
        placeholder="DD/MM/YYYY"
        value={text}
        required={required}
        inputMode="numeric"
        onChange={(e) => {
          setText(e.target.value);
          const iso = parseDMY(e.target.value);
          if (iso) onChange(iso);
        }}
        onBlur={(e) => commit(e.target.value)}
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-brand-600"
        onClick={() => {
          try {
            picker.current?.showPicker();
          } catch {
            picker.current?.focus();
          }
        }}
        aria-label="calendar"
      >
        <CalendarDays className="h-4 w-4" />
      </button>
      <input ref={picker} type="date" tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0" value={value || ''} min={min} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className="input pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type="search" />
    </div>
  );
}

export function InfoRow({ label, children }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 break-words text-slate-800">{children || '-'}</dd>
    </div>
  );
}

/** Wrap an async handler with loading + error toast. */
export function useAsync() {
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  };
  return [busy, run];
}
