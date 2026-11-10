import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, ChevronDown, UserPlus, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useSettings, useToast, useFetch } from '../lib/context.jsx';
import { post, put } from '../lib/api.js';
import { Modal, Field, MoneyInput, DateInput } from './ui.jsx';
import { fmtRM, todayISO, MONTHS, isoFromParts, lastDayOfMonth } from '../lib/format.js';
import { lineAmount } from '@shared/calc.js';
import { PAYMENT_METHODS } from '@shared/constants.js';

// ---------------------------------------------------------------------------
// Customer form (modal) - used on the Customers page and for quick-add
// ---------------------------------------------------------------------------
const EMPTY_CUSTOMER = { name: '', company: '', contact_person: '', phone: '', email: '', billing_address: '', event_location: '', category: '', notes: '' };

export function CustomerFormModal({ open, onClose, customer, onSaved }) {
  const { t } = useT();
  const toast = useToast();
  const { settings } = useSettings();
  const [f, setF] = useState(EMPTY_CUSTOMER);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setF(customer ? { ...EMPTY_CUSTOMER, ...Object.fromEntries(Object.entries(customer).map(([k, v]) => [k, v ?? ''])) } : EMPTY_CUSTOMER);
      setErrors({});
    }
  }, [open, customer]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.name.trim()) errs.name = t('val.required');
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errs.email = t('val.email');
    if (f.phone && !/^[0-9+()\-\s]{6,20}$/.test(f.phone)) errs.phone = t('val.phone');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const saved = customer?.id ? await put(`/customers/${customer.id}`, f) : await post('/customers', f);
      toast.success(customer?.id ? t('cust.updated') : t('cust.created', { no: saved.customer_no }));
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={customer?.id ? `${t('cust.edit')} - ${customer.customer_no}` : t('cust.new')}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" form="customer-form" disabled={busy}>
            {t('common.save')}
          </button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label={t('cust.name')} required error={errors.name} className="sm:col-span-2">
          <input className={`input ${errors.name ? 'input-error' : ''}`} value={f.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label={t('cust.company')}>
          <input className="input" value={f.company} onChange={set('company')} />
        </Field>
        <Field label={t('cust.contactPerson')}>
          <input className="input" value={f.contact_person} onChange={set('contact_person')} />
        </Field>
        <Field label={t('cust.phone')} error={errors.phone}>
          <input className={`input ${errors.phone ? 'input-error' : ''}`} value={f.phone} onChange={set('phone')} inputMode="tel" placeholder="012-345 6789" />
        </Field>
        <Field label={t('cust.email')} error={errors.email}>
          <input className={`input ${errors.email ? 'input-error' : ''}`} value={f.email} onChange={set('email')} type="email" />
        </Field>
        <Field label={t('cust.category')}>
          <select className="input" value={f.category} onChange={set('category')}>
            <option value="">-</option>
            {(settings?.customer_categories || []).map((c) => (
              <option key={c}>{c}</option>
            ))}
            {f.category && !(settings?.customer_categories || []).includes(f.category) && <option>{f.category}</option>}
          </select>
        </Field>
        <div className="hidden sm:block" />
        <Field label={t('cust.billingAddress')}>
          <textarea className="input" rows={3} value={f.billing_address} onChange={set('billing_address')} />
        </Field>
        <Field label={t('cust.eventLocation')}>
          <textarea className="input" rows={3} value={f.event_location} onChange={set('event_location')} />
        </Field>
        <Field label={t('common.notes')} className="sm:col-span-2">
          <textarea className="input" rows={2} value={f.notes} onChange={set('notes')} />
        </Field>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Searchable customer picker with quick-add
// ---------------------------------------------------------------------------
export function CustomerPicker({ value, onChange, invalid, disabled }) {
  const { t } = useT();
  const { data: customers, setData } = useFetch('/customers');
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const selected = customers?.find((c) => c.id === Number(value));
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (customers || []).filter((c) => !n || [c.name, c.company, c.phone, c.customer_no, c.email].filter(Boolean).join(' ').toLowerCase().includes(n)).slice(0, 50);
  }, [customers, q]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        className={`input flex items-center justify-between text-left ${invalid ? 'input-error' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400'}`}>
          {selected ? `${selected.name}${selected.company && selected.company !== selected.name ? ' - ' + selected.company : ''} (${selected.customer_no})` : t('cust.select')}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input className="input" autoFocus placeholder={t('cust.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
            {list.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-brand-50 ${c.id === Number(value) ? 'bg-brand-50' : ''}`}
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQ('');
                  }}
                >
                  <div className="font-medium text-slate-800">{c.name}</div>
                  <div className="text-xs text-slate-500">{[c.customer_no, c.company, c.phone].filter(Boolean).join(' · ')}</div>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">{t('common.noResults')}</li>}
          </ul>
          <div className="border-t border-slate-100 p-1">
            <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50" onClick={() => setAdding(true)}>
              <UserPlus className="h-4 w-4" /> {t('cust.new')}
            </button>
          </div>
        </div>
      )}
      <CustomerFormModal
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={(c) => {
          setData((xs) => [c, ...(xs || [])]);
          onChange(c);
          setOpen(false);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line items editor with catalogue look-up
// ---------------------------------------------------------------------------
export const newItem = () => ({ key: Math.random().toString(36).slice(2), service_id: null, description: '', details: '', quantity: 1, unit: '', unit_price: 0 });

export function LineItemsEditor({ items, onChange, errors }) {
  const { t } = useT();
  const { services } = useSettings();
  const active = (services || []).filter((s) => s.active);
  const update = (i, patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const remove = (i) => onChange(items.length > 1 ? items.filter((_, j) => j !== i) : [newItem()]);
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  const pickService = (i, id) => {
    const s = active.find((x) => x.id === Number(id));
    if (!s) return update(i, { service_id: null });
    update(i, { service_id: s.id, description: s.name, details: s.description || '', unit: s.unit || '', unit_price: s.unit_price });
  };
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={it.key || it.id || i} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <div className="flex items-start gap-2">
            <div className="hidden flex-col items-center pt-7 text-slate-300 sm:flex">
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="grid flex-1 gap-2 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <label className="label text-xs">{t('items.service')}</label>
                <select className="input" value={it.service_id || ''} onChange={(e) => pickService(i, e.target.value)}>
                  <option value="">{t('items.custom')}</option>
                  {active.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.is_package ? '★ ' : ''}
                      {s.name} - {fmtRM(s.unit_price)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-8">
                <label className="label text-xs">
                  {t('items.description')} <span className="text-red-500">*</span>
                </label>
                <input className={`input ${errors?.[i] ? 'input-error' : ''}`} value={it.description} onChange={(e) => update(i, { description: e.target.value })} placeholder={t('items.descriptionPh')} />
              </div>
              <div className="sm:col-span-12">
                <textarea className="input text-xs" rows={1} value={it.details || ''} onChange={(e) => update(i, { details: e.target.value })} placeholder={t('items.detailsPh')} />
              </div>
              <div className="sm:col-span-2">
                <label className="label text-xs">{t('items.qty')}</label>
                <input className="input num text-right" inputMode="decimal" value={it.quantity} onChange={(e) => update(i, { quantity: e.target.value.replace(/[^0-9.]/g, '') })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label text-xs">{t('items.unit')}</label>
                <input className="input" value={it.unit || ''} onChange={(e) => update(i, { unit: e.target.value })} placeholder="pax / set" />
              </div>
              <div className="sm:col-span-4">
                <label className="label text-xs">{t('items.unitPrice')}</label>
                <MoneyInput value={it.unit_price} onChange={(v) => update(i, { unit_price: v })} />
              </div>
              <div className="sm:col-span-4">
                <label className="label text-xs">{t('items.amount')}</label>
                <div className="num rounded-lg border border-transparent bg-white px-3 py-2 text-right text-sm font-semibold text-slate-800">{fmtRM(lineAmount(it.quantity, it.unit_price))}</div>
              </div>
            </div>
            <div className="flex flex-col gap-1 pt-6">
              <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label="move up">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="move down">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button type="button" className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => remove(i)} aria-label={t('common.delete')}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn-secondary w-full border-dashed" onClick={() => onChange([...items, newItem()])}>
        <Plus className="h-4 w-4" /> {t('items.add')}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date range filter with month / year presets
// ---------------------------------------------------------------------------
export function rangeForPreset(preset, year, month) {
  const today = todayISO();
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'thisMonth':
      return { from: isoFromParts(y, m, 1), to: isoFromParts(y, m, lastDayOfMonth(y, m)) };
    case 'lastMonth': {
      const ly = m === 1 ? y - 1 : y;
      const lm = m === 1 ? 12 : m - 1;
      return { from: isoFromParts(ly, lm, 1), to: isoFromParts(ly, lm, lastDayOfMonth(ly, lm)) };
    }
    case 'thisYear':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'lastYear':
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case 'month':
      return { from: isoFromParts(year, month, 1), to: isoFromParts(year, month, lastDayOfMonth(year, month)) };
    case 'year':
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    case 'all':
      return { from: '2000-01-01', to: '2099-12-31' };
    default:
      return null;
  }
}

export function DateRangeFilter({ value, onChange, presets = ['thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'month', 'year', 'custom'], years }) {
  const { t, lang } = useT();
  const today = todayISO();
  const cy = Number(today.slice(0, 4));
  const yearList = years?.length ? [...new Set([cy + 1, cy, ...years])].sort((a, b) => b - a) : [cy + 1, cy, cy - 1, cy - 2, cy - 3];
  const set = (patch) => {
    const next = { ...value, ...patch };
    const r = next.preset === 'custom' ? { from: next.from, to: next.to } : rangeForPreset(next.preset, next.year, next.month);
    onChange({ ...next, ...r });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className="input w-auto py-1.5" value={value.preset} onChange={(e) => set({ preset: e.target.value })} aria-label={t('range.period')}>
        {presets.map((p) => (
          <option key={p} value={p}>
            {t(`range.${p}`)}
          </option>
        ))}
      </select>
      {value.preset === 'month' && (
        <select className="input w-auto py-1.5" value={value.month} onChange={(e) => set({ month: Number(e.target.value) })} aria-label={t('range.month')}>
          {MONTHS[lang].map((mn, i) => (
            <option key={mn} value={i + 1}>
              {mn}
            </option>
          ))}
        </select>
      )}
      {(value.preset === 'month' || value.preset === 'year') && (
        <select className="input w-auto py-1.5" value={value.year} onChange={(e) => set({ year: Number(e.target.value) })} aria-label={t('range.year')}>
          {yearList.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      )}
      {value.preset === 'custom' && (
        <>
          <DateInput className="w-40" value={value.from} onChange={(v) => set({ from: v })} aria-label={t('range.from')} />
          <span className="text-sm text-slate-400">-</span>
          <DateInput className="w-40" value={value.to} onChange={(v) => set({ to: v })} aria-label={t('range.to')} />
        </>
      )}
    </div>
  );
}

export function initialRange(preset = 'thisMonth') {
  const today = todayISO();
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  return { preset, year: y, month: m, ...rangeForPreset(preset, y, m) };
}

// ---------------------------------------------------------------------------
// Record payment modal -> creates payment + receipt
// ---------------------------------------------------------------------------
export function RecordPaymentModal({ open, onClose, invoice, onRecorded, invoices }) {
  const { t } = useT();
  const toast = useToast();
  const [invoiceId, setInvoiceId] = useState(invoice?.id || '');
  const inv = invoice || invoices?.find((i) => i.id === Number(invoiceId));
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!open) return;
    setInvoiceId(invoice?.id || '');
    setErr('');
  }, [open, invoice]);
  useEffect(() => {
    if (!open) return;
    const firstPayment = inv && inv.amount_paid === 0;
    const suggested = inv ? (firstPayment && inv.deposit_required > 0 && inv.deposit_required < inv.balance ? inv.deposit_required : inv.balance) : 0;
    setF({ amount: suggested, payment_date: todayISO(), method: 'Bank Transfer', reference: '', description: '', received_by: '', payment_type: '' });
  }, [open, inv?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    if (!inv) return setErr(t('pay.selectInvoice'));
    if (!f.amount || f.amount <= 0) return setErr(t('pay.amountRequired'));
    if (f.amount > inv.balance) return setErr(t('pay.amountExceeds', { amount: fmtRM(inv.balance) }));
    setBusy(true);
    try {
      const r = await post(`/invoices/${inv.id}/payments`, f);
      toast.success(t('pay.recorded', { no: r.payment.receipt_no }));
      onRecorded?.(r);
      onClose();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  };
  const quick = inv
    ? [
        inv.amount_paid === 0 && inv.deposit_required > 0 && inv.deposit_required < inv.balance && { label: `${t('pay.deposit')} ${Number(inv.deposit_percent)}%`, v: inv.deposit_required },
        { label: '50%', v: Math.round(inv.balance / 2) },
        { label: t('pay.fullBalance'), v: inv.balance },
      ].filter(Boolean)
    : [];
  const open_ = (invoices || []).filter((i) => i.balance > 0 && !['Cancelled'].includes(i.status));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('pay.record')}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-success" form="pay-form" disabled={busy || !inv}>
            {t('pay.saveAndReceipt')}
          </button>
        </>
      }
    >
      <form id="pay-form" onSubmit={submit} className="space-y-4">
        {!invoice && (
          <Field label={t('inv.invoice')} required>
            <select className="input" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
              <option value="">{t('pay.selectInvoice')}</option>
              {open_.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoice_no} - {i.customer_name} ({t('pay.balance')} {fmtRM(i.balance)})
                </option>
              ))}
            </select>
          </Field>
        )}
        {inv && (
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center text-sm">
            <div>
              <div className="text-xs text-slate-500">{t('inv.total')}</div>
              <div className="num font-semibold">{fmtRM(inv.total)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t('inv.paid')}</div>
              <div className="num font-semibold text-emerald-700">{fmtRM(inv.amount_paid)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{t('inv.balance')}</div>
              <div className="num font-semibold text-red-600">{fmtRM(inv.balance)}</div>
            </div>
          </div>
        )}
        <Field label={t('pay.amount')} required>
          <MoneyInput value={f.amount} onChange={(v) => setF({ ...f, amount: v })} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button type="button" key={q.label} className="btn-secondary btn-sm" onClick={() => setF({ ...f, amount: q.v })}>
                {q.label} ({fmtRM(q.v)})
              </button>
            ))}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('pay.date')} required>
            <DateInput value={f.payment_date} onChange={(v) => setF({ ...f, payment_date: v })} />
          </Field>
          <Field label={t('pay.method')} required>
            <select className="input" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`pm.${m}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('pay.reference')} hint={t('pay.referenceHint')}>
            <input className="input" value={f.reference || ''} onChange={(e) => setF({ ...f, reference: e.target.value })} />
          </Field>
          <Field label={t('pay.type')}>
            <select className="input" value={f.payment_type} onChange={(e) => setF({ ...f, payment_type: e.target.value })}>
              <option value="">{t('pay.typeAuto')}</option>
              {['Deposit', 'Partial', 'Balance', 'Full'].map((p) => (
                <option key={p} value={p}>
                  {t(`pt.${p}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('pay.receivedBy')} hint={t('pay.receivedByHint')}>
            <input className="input" value={f.received_by || ''} onChange={(e) => setF({ ...f, received_by: e.target.value })} />
          </Field>
          <Field label={t('pay.description')}>
            <input className="input" value={f.description || ''} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder={t('pay.descriptionPh')} />
          </Field>
        </div>
        {inv && f.amount > 0 && f.amount <= inv.balance && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{t('pay.after', { amount: fmtRM(inv.balance - f.amount) })}</p>
        )}
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      </form>
    </Modal>
  );
}
