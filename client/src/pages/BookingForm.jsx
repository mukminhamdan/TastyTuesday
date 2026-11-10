import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, X, Plus, RotateCcw } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useConfirm, useFetch, useSettings, useToast, useDraft, readDraft, clearDraft } from '../lib/context.jsx';
import { get, post, put, qs } from '../lib/api.js';
import { PageHeader, Card, Field, DateInput, Loading, ErrorState, StatusBadge } from '../components/ui.jsx';
import { CustomerPicker } from '../components/forms.jsx';
import { fmtDate, fmtTimeRange, todayISO } from '../lib/format.js';

const EMPTY = {
  customer_id: '',
  event_name: '',
  event_type: '',
  event_date: '',
  start_time: '',
  end_time: '',
  venue: '',
  event_address: '',
  services: [],
  package: '',
  pax: '',
  special_requirements: '',
  internal_notes: '',
};

export default function BookingForm() {
  const { id } = useParams();
  const editing = !!id;
  const [params] = useSearchParams();
  const { t } = useT();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { settings, services } = useSettings();
  const { data: existing, error, loading } = useFetch(editing ? `/bookings/${id}` : null);
  const [f, setF] = useState(null);
  const [errors, setErrors] = useState({});
  const [conflicts, setConflicts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [customSvc, setCustomSvc] = useState('');
  const [draftAvailable, setDraftAvailable] = useState(null);

  useEffect(() => {
    if (editing) {
      if (existing) setF({ ...EMPTY, ...Object.fromEntries(Object.entries(existing).map(([k, v]) => [k, v ?? ''])), services: existing.services || [] });
    } else {
      setF({ ...EMPTY, customer_id: Number(params.get('customer')) || '', event_date: params.get('date') || '' });
      const d = readDraft('booking-new');
      if (d && (d.event_name || d.customer_id)) setDraftAvailable(d);
    }
  }, [editing, existing, params]);

  useDraft('booking-new', f, !editing && !!f && !draftAvailable);

  // Live overlap detection
  useEffect(() => {
    if (!f?.event_date) return setConflicts([]);
    const h = setTimeout(() => {
      get(`/bookings/conflicts${qs({ date: f.event_date, start: f.start_time, end: f.end_time, exclude: id })}`)
        .then(setConflicts)
        .catch(() => {});
    }, 300);
    return () => clearTimeout(h);
  }, [f?.event_date, f?.start_time, f?.end_time, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorState error={error} />;
  if (!f || loading) return <Loading />;

  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });
  const packages = (services || []).filter((s) => s.active && s.is_package);
  const svcList = (services || []).filter((s) => s.active && !s.is_package);
  const toggleSvc = (name) => setF({ ...f, services: f.services.includes(name) ? f.services.filter((x) => x !== name) : [...f.services, name] });

  const validate = () => {
    const e = {};
    if (!f.customer_id) e.customer_id = t('val.required');
    if (!f.event_name.trim()) e.event_name = t('val.required');
    if (!f.event_date) e.event_date = t('val.required');
    if (f.start_time && f.end_time && f.end_time <= f.start_time) e.end_time = t('val.endAfterStart');
    if (f.pax !== '' && (!/^\d+$/.test(String(f.pax)))) e.pax = t('val.number');
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async (allow_overlap = false) => {
    if (!validate()) return toast.error(t('val.fixErrors'));
    setBusy(true);
    try {
      const body = { ...f, pax: f.pax === '' ? null : Number(f.pax), allow_overlap };
      const saved = editing ? await put(`/bookings/${id}`, body) : await post('/bookings', body);
      if (!editing) clearDraft('booking-new');
      toast.success(editing ? t('common.saved') : t('book.created', { no: saved.booking_no }));
      nav(`/bookings/${saved.id}`);
    } catch (e) {
      if (e.status === 409 && e.data?.code === 'OVERLAP') {
        setConflicts(e.data.conflicts);
        const list = e.data.conflicts.map((c) => `• ${c.booking_no} ${c.event_name} (${fmtTimeRange(c.start_time, c.end_time) || t('book.allDay')})`).join('\n');
        if (await confirm({ title: t('book.overlapTitle'), message: `${t('book.overlapMsg')}\n\n${list}`, confirmText: t('book.saveAnyway') })) {
          setBusy(false);
          return save(true);
        }
      } else toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        back={
          <Link to={editing ? `/bookings/${id}` : '/bookings'} className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" /> {t('common.back')}
          </Link>
        }
        title={editing ? `${t('book.edit')} ${existing.booking_no}` : t('book.new')}
        subtitle={editing ? <StatusBadge status={existing.status} /> : t('book.newSubtitle')}
      />
      {draftAvailable && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <RotateCcw className="h-4 w-4" />
          <span className="flex-1">{t('draft.found')}</span>
          <button
            className="btn-secondary btn-sm"
            onClick={() => {
              setF({ ...EMPTY, ...draftAvailable });
              setDraftAvailable(null);
            }}
          >
            {t('draft.restore')}
          </button>
          <button
            className="btn-ghost btn-sm"
            onClick={() => {
              clearDraft('booking-new');
              setDraftAvailable(null);
            }}
          >
            {t('draft.discard')}
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="grid gap-5 lg:grid-cols-3"
        noValidate
      >
        <div className="space-y-5 lg:col-span-2">
          <Card title={t('book.customerEvent')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('cust.customer')} required error={errors.customer_id} className="sm:col-span-2">
                <CustomerPicker
                  value={f.customer_id}
                  invalid={!!errors.customer_id}
                  onChange={(c) => setF((p) => ({ ...p, customer_id: c.id, venue: p.venue || '', event_address: p.event_address || c.event_location || '' }))}
                />
              </Field>
              <Field label={t('book.eventName')} required error={errors.event_name} className="sm:col-span-2">
                <input className={`input ${errors.event_name ? 'input-error' : ''}`} value={f.event_name} onChange={set('event_name')} placeholder={t('book.eventNamePh')} />
              </Field>
              <Field label={t('book.eventType')}>
                <select className="input" value={f.event_type} onChange={set('event_type')}>
                  <option value="">-</option>
                  {(settings.event_types || []).map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                  {f.event_type && !(settings.event_types || []).includes(f.event_type) && <option>{f.event_type}</option>}
                </select>
              </Field>
              <Field label={t('book.pax')} error={errors.pax}>
                <input className={`input ${errors.pax ? 'input-error' : ''}`} inputMode="numeric" value={f.pax} onChange={set('pax')} />
              </Field>
            </div>
          </Card>

          <Card title={t('book.dateVenue')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t('book.date')} required error={errors.event_date}>
                <DateInput value={f.event_date} onChange={set('event_date')} invalid={!!errors.event_date} />
                {f.event_date && f.event_date < todayISO() && <p className="mt-1 text-xs text-amber-700">{t('book.pastDate')}</p>}
              </Field>
              <Field label={t('book.startTime')}>
                <input type="time" className="input" value={f.start_time} onChange={set('start_time')} />
              </Field>
              <Field label={t('book.endTime')} error={errors.end_time}>
                <input type="time" className={`input ${errors.end_time ? 'input-error' : ''}`} value={f.end_time} onChange={set('end_time')} />
              </Field>
              {conflicts.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-3">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" /> {t('book.overlapWarning', { n: conflicts.length })}
                  </div>
                  <ul className="space-y-0.5">
                    {conflicts.map((c) => (
                      <li key={c.id}>
                        <Link to={`/bookings/${c.id}`} target="_blank" className="font-medium underline">
                          {c.booking_no}
                        </Link>{' '}
                        {c.event_name} · {c.customer_name} · {fmtDate(c.event_date)} {fmtTimeRange(c.start_time, c.end_time) || t('book.allDay')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Field label={t('book.venue')} className="sm:col-span-3">
                <input className="input" value={f.venue} onChange={set('venue')} placeholder={t('book.venuePh')} />
              </Field>
              <Field label={t('book.address')} className="sm:col-span-3">
                <textarea className="input" rows={2} value={f.event_address} onChange={set('event_address')} />
              </Field>
            </div>
          </Card>

          <Card title={t('book.servicesPackage')}>
            <div className="space-y-4">
              <Field label={t('book.package')}>
                <input className="input" list="pkg-list" value={f.package} onChange={set('package')} placeholder={t('book.packagePh')} />
                <datalist id="pkg-list">
                  {packages.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </Field>
              <Field label={t('book.services')} hint={t('book.servicesHint')}>
                <div className="flex flex-wrap gap-2">
                  {svcList.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggleSvc(s.name)}
                      className={`rounded-full border px-3 py-1 text-sm transition ${f.services.includes(s.name) ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}
                    >
                      {s.name}
                    </button>
                  ))}
                  {f.services
                    .filter((n) => !svcList.some((s) => s.name === n))
                    .map((n) => (
                      <span key={n} className="inline-flex items-center gap-1 rounded-full border border-brand-600 bg-brand-50 px-3 py-1 text-sm text-brand-800">
                        {n}
                        <button type="button" onClick={() => toggleSvc(n)} aria-label="remove">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    className="input"
                    value={customSvc}
                    onChange={(e) => setCustomSvc(e.target.value)}
                    placeholder={t('book.addCustomService')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customSvc.trim() && !f.services.includes(customSvc.trim())) setF({ ...f, services: [...f.services, customSvc.trim()] });
                        setCustomSvc('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (customSvc.trim() && !f.services.includes(customSvc.trim())) setF({ ...f, services: [...f.services, customSvc.trim()] });
                      setCustomSvc('');
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title={t('book.notes')}>
            <div className="space-y-4">
              <Field label={t('book.specialRequirements')}>
                <textarea className="input" rows={4} value={f.special_requirements} onChange={set('special_requirements')} />
              </Field>
              <Field label={t('book.internalNotes')} hint={t('book.internalNotesHint')}>
                <textarea className="input" rows={4} value={f.internal_notes} onChange={set('internal_notes')} />
              </Field>
            </div>
          </Card>
          <div className="card card-pad sticky bottom-4 flex flex-col gap-2">
            <button className="btn-primary w-full" disabled={busy}>
              {editing ? t('common.saveChanges') : t('book.create')}
            </button>
            <Link to={editing ? `/bookings/${id}` : '/bookings'} className="btn-secondary w-full">
              {t('common.cancel')}
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
