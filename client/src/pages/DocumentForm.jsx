import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Send, Save } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useFetch, useSettings, useToast, useDraft, readDraft, clearDraft } from '../lib/context.jsx';
import { get, post, put } from '../lib/api.js';
import { PageHeader, Card, Field, DateInput, MoneyInput, Loading, ErrorState, StatusBadge } from '../components/ui.jsx';
import { CustomerPicker, LineItemsEditor, newItem } from '../components/forms.jsx';
import { calcTotals } from '@shared/calc.js';
import { fmtRM, fmtDate, todayISO, addDays } from '../lib/format.js';

/** Create / edit form shared by quotations and invoices. */
export default function DocumentForm({ kind }) {
  const isQ = kind === 'quotation';
  const base = isQ ? '/quotations' : '/invoices';
  const { id } = useParams();
  const editing = !!id;
  const [params] = useSearchParams();
  const { t } = useT();
  const nav = useNavigate();
  const toast = useToast();
  const { settings } = useSettings();
  const { data: existing, error } = useFetch(editing ? `${base}/${id}` : null);
  const [f, setF] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);
  const draftKey = `${kind}-new`;

  // Initialise form
  useEffect(() => {
    if (editing) {
      if (!existing) return;
      setF({
        ...existing,
        items: existing.items.map((it) => ({ ...it, key: String(it.id) })),
        tax_enabled: !!existing.tax_enabled,
        discount_value: existing.discount_value || 0,
      });
      return;
    }
    const today = todayISO();
    const init = {
      customer_id: Number(params.get('customer')) || '',
      booking_id: Number(params.get('booking')) || '',
      event_name: '',
      event_date: '',
      event_venue: '',
      items: [newItem()],
      discount_type: 'fixed',
      discount_value: 0,
      additional_label: '',
      additional_charges: 0,
      tax_enabled: !!settings.tax_enabled_default,
      tax_rate: settings.tax_rate_default,
      tax_label: settings.tax_label,
      notes: '',
      ...(isQ
        ? { quotation_date: today, valid_until: addDays(today, settings.quotation_validity_days || 14), terms: settings.quotation_terms, payment_terms: settings.payment_terms }
        : {
            invoice_date: today,
            due_date: addDays(today, settings.payment_terms_days || 14),
            terms: settings.invoice_terms,
            payment_instructions: settings.payment_instructions,
            deposit_percent: settings.deposit_percent,
          }),
    };
    setF(init);
    const d = readDraft(draftKey);
    if (d && d.items?.some((i) => i.description)) setDraft(d);
  }, [editing, existing, params, settings, isQ, draftKey]);

  useDraft(draftKey, f, !editing && !!f && !draft);

  // Customer details + their bookings (auto-retrieved)
  const { data: custDetail } = useFetch(f?.customer_id ? `/customers/${f.customer_id}` : null, []);
  useEffect(() => {
    if (custDetail) setCustomer(custDetail);
  }, [custDetail]);

  // Prefill event fields from linked booking
  const pickBooking = async (bookingId) => {
    if (!bookingId) return setF((p) => ({ ...p, booking_id: '' }));
    try {
      const b = await get(`/bookings/${bookingId}`);
      setF((p) => ({
        ...p,
        booking_id: b.id,
        event_name: b.event_name,
        event_date: b.event_date,
        event_venue: [b.venue, b.event_address].filter(Boolean).join(', '),
        due_date: !isQ && b.event_date && b.event_date < p.due_date && b.event_date >= p.invoice_date ? b.event_date : p.due_date,
      }));
    } catch (e) {
      toast.error(e);
    }
  };
  useEffect(() => {
    if (!editing && f && f.booking_id && !f.event_name) pickBooking(f.booking_id);
  }, [f?.booking_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => (f ? calcTotals(f) : null), [f]);

  if (error) return <ErrorState error={error} />;
  if (!f) return <Loading />;

  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v?.target ? (v.target.type === 'checkbox' ? v.target.checked : v.target.value) : v }));
  const locked = editing && ((isQ && existing.status === 'Approved') || (!isQ && ['Paid', 'Cancelled'].includes(existing.status)));
  const dateKey = isQ ? 'quotation_date' : 'invoice_date';
  const endKey = isQ ? 'valid_until' : 'due_date';

  const validate = () => {
    const e = {};
    if (!f.customer_id) e.customer_id = t('val.required');
    if (!f[dateKey]) e[dateKey] = t('val.required');
    if (!f[endKey]) e[endKey] = t('val.required');
    if (f[dateKey] && f[endKey] && f[endKey] < f[dateKey]) e[endKey] = t('val.endAfterDocDate');
    const itemErr = {};
    f.items.forEach((it, i) => {
      if (!String(it.description).trim()) itemErr[i] = true;
    });
    if (Object.keys(itemErr).length) e.items = itemErr;
    if (f.items.some((it) => !(Number(it.quantity) > 0))) e.qty = t('val.qty');
    if (f.discount_type === 'percent' && Number(f.discount_value) > 100) e.discount = t('val.discount');
    if (!isQ && existing && totals.total < existing.amount_paid) e.total = t('val.totalBelowPaid', { amount: fmtRM(existing.amount_paid) });
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async (status) => {
    if (!validate()) return toast.error(t('val.fixErrors'));
    setBusy(true);
    try {
      const body = { ...f, status, items: f.items.map(({ key, ...it }) => ({ ...it, quantity: Number(it.quantity) })) };
      const saved = editing ? await put(`${base}/${id}`, body) : await post(base, body);
      if (!editing) clearDraft(draftKey);
      toast.success(editing ? t('common.saved') : t(isQ ? 'quo.created' : 'inv.created', { no: saved[isQ ? 'quotation_no' : 'invoice_no'] }));
      nav(`${base}/${saved.id}`);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const bookings = (customer?.id === Number(f.customer_id) ? customer.bookings : []).filter((b) => b.status !== 'Cancelled' || b.id === f.booking_id);
  const isDraft = !editing || existing.status === 'Draft';

  return (
    <div>
      <PageHeader
        back={
          <Link to={editing ? `${base}/${id}` : base} className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" /> {t('common.back')}
          </Link>
        }
        title={editing ? `${t('common.edit')} ${existing[isQ ? 'quotation_no' : 'invoice_no']}` : t(isQ ? 'quo.new' : 'inv.new')}
        subtitle={editing ? <StatusBadge status={existing.status} /> : t(isQ ? 'quo.newSubtitle' : 'inv.newSubtitle')}
      />
      {locked && <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{t(isQ ? 'quo.lockedMsg' : 'inv.lockedMsg')}</div>}
      {draft && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <RotateCcw className="h-4 w-4" />
          <span className="flex-1">{t('draft.found')}</span>
          <button className="btn-secondary btn-sm" onClick={() => (setF(draft), setDraft(null))}>
            {t('draft.restore')}
          </button>
          <button className="btn-ghost btn-sm" onClick={() => (clearDraft(draftKey), setDraft(null))}>
            {t('draft.discard')}
          </button>
        </div>
      )}
      <fieldset disabled={locked} className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card title={t('doc.customerDetails')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('cust.customer')} required error={errors.customer_id} className="sm:col-span-2">
                <CustomerPicker
                  value={f.customer_id}
                  invalid={!!errors.customer_id}
                  disabled={!isQ && editing && existing.amount_paid > 0}
                  onChange={(c) => setF((p) => ({ ...p, customer_id: c.id, booking_id: p.customer_id === c.id ? p.booking_id : '' }))}
                />
              </Field>
              {customer && customer.id === Number(f.customer_id) && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 sm:col-span-2">
                  <div className="font-medium text-slate-800">
                    {customer.name} {customer.company && customer.company !== customer.name && `· ${customer.company}`}
                  </div>
                  <div className="whitespace-pre-line">{customer.billing_address || t('doc.noAddress')}</div>
                  <div>{[customer.contact_person, customer.phone, customer.email].filter(Boolean).join(' · ')}</div>
                </div>
              )}
              <Field label={t('doc.linkBooking')} hint={t('doc.linkBookingHint')} className="sm:col-span-2">
                <select className="input" value={f.booking_id || ''} onChange={(e) => pickBooking(e.target.value)} disabled={!f.customer_id || (!isQ && editing && existing.amount_paid > 0)}>
                  <option value="">{t('doc.noBooking')}</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.booking_no} - {b.event_name} ({fmtDate(b.event_date)})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card title={t('doc.eventDetails')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('book.eventName')} className="sm:col-span-2">
                <input className="input" value={f.event_name || ''} onChange={set('event_name')} />
              </Field>
              <Field label={t('book.date')}>
                <DateInput value={f.event_date || ''} onChange={set('event_date')} />
              </Field>
              <Field label={t('book.venue')}>
                <input className="input" value={f.event_venue || ''} onChange={set('event_venue')} />
              </Field>
            </div>
          </Card>

          <Card title={t('doc.items')}>
            <LineItemsEditor items={f.items} onChange={set('items')} errors={errors.items} />
            {errors.qty && <p className="mt-2 text-sm text-red-600">{errors.qty}</p>}
          </Card>

          <Card title={t('doc.termsNotes')}>
            <div className="grid gap-4">
              {isQ ? (
                <Field label={t('doc.paymentTerms')}>
                  <textarea className="input" rows={2} value={f.payment_terms || ''} onChange={set('payment_terms')} />
                </Field>
              ) : (
                <Field label={t('doc.paymentInstructions')}>
                  <textarea className="input" rows={2} value={f.payment_instructions || ''} onChange={set('payment_instructions')} />
                </Field>
              )}
              <Field label={t('doc.terms')}>
                <textarea className="input" rows={4} value={f.terms || ''} onChange={set('terms')} />
              </Field>
              <Field label={t('doc.notes')} hint={t('doc.notesHint')}>
                <textarea className="input" rows={2} value={f.notes || ''} onChange={set('notes')} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title={t('doc.documentInfo')}>
            <div className="grid gap-4">
              <Field label={t(isQ ? 'quo.date' : 'inv.date')} required error={errors[dateKey]}>
                <DateInput value={f[dateKey]} onChange={set(dateKey)} invalid={!!errors[dateKey]} />
              </Field>
              <Field label={t(isQ ? 'quo.validUntil' : 'inv.dueDate')} required error={errors[endKey]}>
                <DateInput value={f[endKey]} onChange={set(endKey)} invalid={!!errors[endKey]} />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {[7, 14, 30].map((d) => (
                    <button type="button" key={d} className="btn-ghost btn-sm border border-slate-200" onClick={() => set(endKey)(addDays(f[dateKey] || todayISO(), d))}>
                      +{d} {t('common.days')}
                    </button>
                  ))}
                </div>
              </Field>
              {!isQ && (
                <Field label={t('inv.depositPercent')} hint={t('inv.depositHint')}>
                  <div className="relative">
                    <input className="input num pr-8 text-right" inputMode="decimal" value={f.deposit_percent} onChange={(e) => set('deposit_percent')(e.target.value.replace(/[^0-9.]/g, ''))} />
                    <span className="absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">%</span>
                  </div>
                </Field>
              )}
            </div>
          </Card>

          <Card title={t('doc.pricing')}>
            <div className="space-y-4">
              <Field label={t('doc.discount')} error={errors.discount}>
                <div className="flex gap-2">
                  <select className="input w-28" value={f.discount_type} onChange={(e) => setF({ ...f, discount_type: e.target.value, discount_value: 0 })}>
                    <option value="fixed">RM</option>
                    <option value="percent">%</option>
                  </select>
                  {f.discount_type === 'percent' ? (
                    <input className="input num text-right" inputMode="decimal" value={f.discount_value} onChange={(e) => set('discount_value')(e.target.value.replace(/[^0-9.]/g, ''))} />
                  ) : (
                    <MoneyInput className="flex-1" value={f.discount_value} onChange={set('discount_value')} />
                  )}
                </div>
              </Field>
              <Field label={t('doc.additionalCharges')}>
                <input className="input mb-2" value={f.additional_label || ''} onChange={set('additional_label')} placeholder={t('doc.additionalPh')} />
                <MoneyInput value={f.additional_charges} onChange={set('additional_charges')} />
              </Field>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-700" checked={!!f.tax_enabled} onChange={set('tax_enabled')} />
                  {t('doc.applyTax')}
                </label>
                {f.tax_enabled && (
                  <div className="mt-2 flex gap-2">
                    <input className="input w-28" value={f.tax_label || ''} onChange={set('tax_label')} placeholder="SST" />
                    <div className="relative flex-1">
                      <input className="input num pr-8 text-right" inputMode="decimal" value={f.tax_rate} onChange={(e) => set('tax_rate')(e.target.value.replace(/[^0-9.]/g, ''))} />
                      <span className="absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div className="card card-pad sticky bottom-4 space-y-1.5 text-sm">
            <Row label={t('doc.subtotal')} value={fmtRM(totals.subtotal)} />
            {totals.discount_amount > 0 && <Row label={t('doc.discount')} value={'-' + fmtRM(totals.discount_amount)} />}
            {totals.additional_charges > 0 && <Row label={f.additional_label || t('doc.additionalCharges')} value={fmtRM(totals.additional_charges)} />}
            {f.tax_enabled && <Row label={`${f.tax_label || t('doc.tax')} (${Number(f.tax_rate) || 0}%)`} value={fmtRM(totals.tax_amount)} />}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
              <span>{t('doc.grandTotal')}</span>
              <span className="num">{fmtRM(totals.total)}</span>
            </div>
            {!isQ && Number(f.deposit_percent) > 0 && <Row label={`${t('doc.depositRequired')} (${f.deposit_percent}%)`} value={fmtRM(Math.round((totals.total * Number(f.deposit_percent)) / 100))} />}
            {!isQ && editing && existing.amount_paid > 0 && <Row label={t('inv.paid')} value={fmtRM(existing.amount_paid)} />}
            {errors.total && <p className="text-sm text-red-600">{errors.total}</p>}
            <div className="flex flex-col gap-2 pt-3">
              {isDraft ? (
                <>
                  <button type="button" className="btn-primary w-full" disabled={busy || locked} onClick={() => save('Sent')}>
                    <Send className="h-4 w-4" /> {t('doc.saveAndSend')}
                  </button>
                  <button type="button" className="btn-secondary w-full" disabled={busy || locked} onClick={() => save()}>
                    <Save className="h-4 w-4" /> {t('doc.saveDraft')}
                  </button>
                </>
              ) : (
                <button type="button" className="btn-primary w-full" disabled={busy || locked} onClick={() => save()}>
                  <Save className="h-4 w-4" /> {t('common.saveChanges')}
                </button>
              )}
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}

