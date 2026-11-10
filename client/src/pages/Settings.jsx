import { useEffect, useRef, useState } from 'react';
import { Save, Upload, Trash2, Plus, Pencil, Download, DatabaseBackup, HardDriveDownload, UserPlus, ShieldAlert } from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useAuth, useConfirm, useFetch, useSettings, useToast } from '../lib/context.jsx';
import { del, get, post, put } from '../lib/api.js';
import { PageHeader, Card, Field, Tabs, Modal, MoneyInput, Badge, Loading } from '../components/ui.jsx';
import DocumentPreview from '../components/DocumentPreview.jsx';
import { buildDocModel } from '../lib/docModel.js';
import { downloadBlob, fmtRM, fmtDateTime, todayISO, addDays } from '../lib/format.js';

/** Resize an uploaded image to a PNG data URL (max 600px). */
function imageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('invalid image'));
      img.onload = () => {
        const scale = Math.min(1, 600 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const { t } = useT();
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('business');
  const tabs = [
    { value: 'business', label: t('settings.business') },
    { value: 'documents', label: t('settings.documents') },
    { value: 'numbering', label: t('settings.numbering') },
    { value: 'services', label: t('settings.services') },
    { value: 'lists', label: t('settings.lists') },
    ...(isAdmin
      ? [
          { value: 'users', label: t('settings.users') },
          { value: 'backup', label: t('settings.backup') },
        ]
      : []),
  ];
  return (
    <div>
      <PageHeader title={t('nav.settings')} subtitle={t('settings.subtitle')} />
      {!isAdmin && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <ShieldAlert className="h-4 w-4" /> {t('settings.adminOnly')}
        </div>
      )}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {['business', 'documents', 'numbering', 'lists'].includes(tab) && <SettingsForm tab={tab} readOnly={!isAdmin} />}
      {tab === 'numbering' && <NextNumbers readOnly={!isAdmin} />}
      {tab === 'services' && <ServicesTab readOnly={!isAdmin} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'backup' && <BackupTab />}
    </div>
  );
}

function SettingsForm({ tab, readOnly }) {
  const { t, lang } = useT();
  const toast = useToast();
  const { settings, setSettings } = useSettings();
  const [f, setF] = useState(settings);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => setF(settings), [settings]);
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e });

  const save = async (e) => {
    e?.preventDefault();
    if (!f.business_name?.trim()) return toast.error(t('settings.businessNameRequired'));
    setBusy(true);
    try {
      const saved = await put('/settings', f);
      setSettings(saved);
      toast.success(t('settings.saved'));
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };
  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error(t('settings.logoTooBig'));
    try {
      setF({ ...f, logo: await imageToDataUrl(file) });
    } catch {
      toast.error(t('settings.logoInvalid'));
    }
  };

  const sample = {
    quotation_no: `${f.prefix_quotation}-${todayISO().slice(0, 4)}-0001`,
    quotation_date: todayISO(),
    valid_until: addDays(todayISO(), f.quotation_validity_days || 14),
    customer_name: 'Syarikat Contoh Sdn Bhd',
    customer_contact: 'Encik Ali',
    customer_address: 'No. 1, Jalan Contoh\n50000 Kuala Lumpur',
    customer_phone: '012-345 6789',
    event_name: 'Majlis Makan Malam Tahunan',
    event_date: addDays(todayISO(), 30),
    event_venue: 'Dewan Utama',
    items: [
      { description: 'Pakej Persembahan', details: '2 jam persembahan', quantity: 1, unit_price: 250000, amount: 250000 },
      { description: 'Sistem PA', quantity: 1, unit: 'set', unit_price: 50000, amount: 50000 },
    ],
    subtotal: 300000,
    discount_amount: 0,
    tax_enabled: f.tax_enabled_default,
    tax_rate: f.tax_rate_default,
    tax_label: f.tax_label,
    tax_amount: f.tax_enabled_default ? Math.round(300000 * (Number(f.tax_rate_default) || 0) / 100) : 0,
    total: 300000 + (f.tax_enabled_default ? Math.round(300000 * (Number(f.tax_rate_default) || 0) / 100) : 0),
    payment_terms: f.payment_terms,
    terms: f.quotation_terms,
  };

  const list = (k) => (
    <textarea className="input" rows={8} value={(f[k] || []).join('\n')} onChange={(e) => setF({ ...f, [k]: e.target.value.split('\n') })} onBlur={() => setF({ ...f, [k]: (f[k] || []).map((x) => x.trim()).filter(Boolean) })} />
  );

  return (
    <form onSubmit={save}>
      <fieldset disabled={readOnly}>
        {tab === 'business' && (
          <div className="grid gap-5 lg:grid-cols-3">
            <Card title={t('settings.businessInfo')} className="lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('settings.businessName')} required>
                  <input className="input" value={f.business_name || ''} onChange={set('business_name')} />
                </Field>
                <Field label={t('settings.registrationNo')} hint={t('settings.registrationHint')}>
                  <input className="input" value={f.registration_no || ''} onChange={set('registration_no')} />
                </Field>
                <Field label={t('settings.address')} className="sm:col-span-2">
                  <textarea className="input" rows={3} value={f.address || ''} onChange={set('address')} />
                </Field>
                <Field label={t('cust.phone')}>
                  <input className="input" value={f.phone || ''} onChange={set('phone')} />
                </Field>
                <Field label={t('cust.email')}>
                  <input className="input" type="email" value={f.email || ''} onChange={set('email')} />
                </Field>
                <Field label={t('settings.website')}>
                  <input className="input" value={f.website || ''} onChange={set('website')} placeholder="www.contoh.com.my" />
                </Field>
                <Field label={t('settings.social')}>
                  <input className="input" value={f.social_media || ''} onChange={set('social_media')} placeholder="@namaperniagaan" />
                </Field>
              </div>
            </Card>
            <div className="space-y-5">
              <Card title={t('settings.logo')}>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
                    {f.logo ? <img src={f.logo} alt="logo" className="max-h-28 max-w-[90%] object-contain" /> : <span className="text-sm text-slate-400">{t('settings.noLogo')}</span>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={onLogo} />
                  <div className="flex gap-2">
                    <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
                      <Upload className="h-4 w-4" /> {t('settings.uploadLogo')}
                    </button>
                    {f.logo && (
                      <button type="button" className="btn-ghost text-red-600" onClick={() => setF({ ...f, logo: '' })}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-center text-xs text-slate-500">{t('settings.logoHint')}</p>
                </div>
              </Card>
              <Card title={t('settings.bank')}>
                <div className="grid gap-4">
                  <Field label={t('doc.bankName')}>
                    <input className="input" value={f.bank_name || ''} onChange={set('bank_name')} placeholder="Maybank / CIMB / Bank Islam" />
                  </Field>
                  <Field label={t('doc.accountNo')}>
                    <input className="input" value={f.bank_account_no || ''} onChange={set('bank_account_no')} />
                  </Field>
                  <Field label={t('doc.accountName')}>
                    <input className="input" value={f.bank_account_name || ''} onChange={set('bank_account_name')} />
                  </Field>
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === 'documents' && (
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-5">
              <Card title={t('settings.template')}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {['modern', 'classic', 'minimal', 'boxed'].map((tpl) => (
                    <button type="button" key={tpl} onClick={() => setF({ ...f, doc_template: tpl })} className={`rounded-lg border-2 p-3 text-sm font-medium ${f.doc_template === tpl ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600'}`}>
                      {t(`settings.tpl.${tpl}`)}
                    </button>
                  ))}
                </div>
                {f.doc_template === 'boxed' && <p className="mt-2 text-xs text-slate-500">{t('settings.tplBoxedHint')}</p>}
                <div className="mt-4 flex items-center gap-3">
                  <label className="label mb-0">{t('settings.accent')}</label>
                  <input type="color" className="h-9 w-14 cursor-pointer rounded border border-slate-300" value={f.accent_color} onChange={set('accent_color')} />
                  <span className="font-mono text-xs text-slate-500">{f.accent_color}</span>
                </div>
              </Card>
              <Card title={t('settings.signatory')}>
                <p className="mb-3 text-xs text-slate-500">{t('settings.signatoryHint')}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('settings.signatoryName')}>
                    <input className="input" value={f.signatory_name || ''} onChange={set('signatory_name')} placeholder="ABDUL MUKMIN BIN HAMDAN" />
                  </Field>
                  <Field label={t('settings.signatoryTitle')}>
                    <input className="input" value={f.signatory_title || ''} onChange={set('signatory_title')} placeholder="PENGURUS" />
                  </Field>
                </div>
              </Card>
              <Card title={t('settings.defaults')}>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={t('settings.quotationValidity')} hint={t('common.days')}>
                    <input className="input" type="number" min="0" value={f.quotation_validity_days} onChange={set('quotation_validity_days')} />
                  </Field>
                  <Field label={t('settings.paymentTermsDays')} hint={t('common.days')}>
                    <input className="input" type="number" min="0" value={f.payment_terms_days} onChange={set('payment_terms_days')} />
                  </Field>
                  <Field label={t('inv.depositPercent')} hint="%">
                    <input className="input" type="number" min="0" max="100" value={f.deposit_percent} onChange={set('deposit_percent')} />
                  </Field>
                  <div className="sm:col-span-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={!!f.tax_enabled_default} onChange={set('tax_enabled_default')} /> {t('settings.taxDefault')}
                    </label>
                  </div>
                  <Field label={t('settings.taxLabel')}>
                    <input className="input" value={f.tax_label || ''} onChange={set('tax_label')} />
                  </Field>
                  <Field label={t('settings.taxRate')} hint="%">
                    <input className="input" type="number" min="0" max="100" step="0.01" value={f.tax_rate_default} onChange={set('tax_rate_default')} />
                  </Field>
                </div>
              </Card>
              <Card title={t('settings.texts')}>
                <div className="grid gap-4">
                  <Field label={t('settings.quotationTerms')}>
                    <textarea className="input" rows={4} value={f.quotation_terms || ''} onChange={set('quotation_terms')} />
                  </Field>
                  <Field label={t('doc.paymentTerms')}>
                    <textarea className="input" rows={2} value={f.payment_terms || ''} onChange={set('payment_terms')} />
                  </Field>
                  <Field label={t('settings.invoiceTerms')}>
                    <textarea className="input" rows={3} value={f.invoice_terms || ''} onChange={set('invoice_terms')} />
                  </Field>
                  <Field label={t('doc.paymentInstructions')}>
                    <textarea className="input" rows={2} value={f.payment_instructions || ''} onChange={set('payment_instructions')} />
                  </Field>
                  <Field label={t('settings.footer')}>
                    <input className="input" value={f.doc_footer || ''} onChange={set('doc_footer')} />
                  </Field>
                </div>
              </Card>
            </div>
            <div>
              <div className="sticky top-20">
                <div className="mb-2 text-sm font-semibold text-slate-700">{t('settings.preview')}</div>
                <div className="origin-top scale-100">
                  <DocumentPreview model={buildDocModel('quotation', sample, f, lang)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'numbering' && (
          <Card title={t('settings.numbering')}>
            <p className="mb-4 text-sm text-slate-500">{t('settings.numberingHint')}</p>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={f.number_include_year !== false} onChange={set('number_include_year')} /> {t('settings.includeYear')}
            </label>
            <p className="mb-4 pl-6 text-xs text-slate-500">{t('settings.includeYearHint')}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {['customer', 'booking', 'quotation', 'invoice', 'receipt'].map((k) => (
                <Field
                  key={k}
                  label={t(`settings.prefix.${k}`)}
                  hint={`${t('settings.example')}: ${[(f[`prefix_${k}`] || '').toUpperCase(), k !== 'customer' && f.number_include_year !== false ? todayISO().slice(0, 4) : null, '0001'].filter(Boolean).join('-')}`}
                >
                  <input className="input font-mono uppercase" maxLength={10} value={f[`prefix_${k}`] || ''} placeholder={k === 'customer' ? '' : t('settings.noPrefix')}
                    title={k === 'customer' ? undefined : t('settings.emptyPrefixHint')} onChange={(e) => setF({ ...f, [`prefix_${k}`]: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })} />
                </Field>
              ))}
            </div>
          </Card>
        )}

        {tab === 'lists' && (
          <div className="grid gap-5 md:grid-cols-2">
            <Card title={t('settings.customerCategories')}>
              <p className="mb-2 text-xs text-slate-500">{t('settings.onePerLine')}</p>
              {list('customer_categories')}
            </Card>
            <Card title={t('settings.eventTypes')}>
              <p className="mb-2 text-xs text-slate-500">{t('settings.onePerLine')}</p>
              {list('event_types')}
            </Card>
          </div>
        )}

        {!readOnly && (
          <div className="sticky bottom-4 mt-5 flex justify-end">
            <button className="btn-primary shadow-lg" disabled={busy}>
              <Save className="h-4 w-4" /> {t('settings.save')}
            </button>
          </div>
        )}
      </fieldset>
    </form>
  );
}

function NextNumbers({ readOnly }) {
  const { t } = useT();
  const toast = useToast();
  const { settings } = useSettings();
  const { data, setData, reload } = useFetch('/settings/counters');
  const [f, setF] = useState({});
  useEffect(() => {
    reload();
  }, [settings, reload]);
  useEffect(() => {
    if (data) setF(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.next])));
  }, [data]);
  if (!data) return null;
  const save = async () => {
    const changed = Object.fromEntries(Object.entries(f).filter(([k, v]) => Number(v) !== data[k].next).map(([k, v]) => [k, Number(v)]));
    try {
      setData(await put('/settings/counters', changed));
      toast.success(t('common.saved'));
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <Card title={t('settings.nextNumber')} className="mt-5">
      <p className="mb-4 text-sm text-slate-500">{t('settings.nextNumberHint')}</p>
      <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {['customer', 'booking', 'quotation', 'invoice', 'receipt'].map((k) => (
          <Field key={k} label={t(`settings.prefix.${k}`).replace(/^Awalan /, 'No. ').replace(/ prefix$/, ' no.')} hint={`${t('settings.willBe')}: ${data[k].preview}`}>
            <input className="input num" type="number" min={data[k].next} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </Field>
        ))}
      </fieldset>
      {!readOnly && (
        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-secondary" onClick={save}>
            <Save className="h-4 w-4" /> {t('settings.saveNumbers')}
          </button>
        </div>
      )}
    </Card>
  );
}

function ServicesTab({ readOnly }) {
  const { t } = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const { services, reload } = useSettings();
  const [edit, setEdit] = useState(null);
  const save = async () => {
    if (!edit.name?.trim()) return toast.error(t('val.required'));
    try {
      if (edit.id) await put(`/services/${edit.id}`, edit);
      else await post('/services', edit);
      toast.success(t('common.saved'));
      setEdit(null);
      reload();
    } catch (e) {
      toast.error(e);
    }
  };
  const remove = async (s) => {
    if (!(await confirm({ title: t('settings.deleteService'), message: s.name, danger: true, confirmText: t('common.delete') }))) return;
    try {
      await del(`/services/${s.id}`);
      reload();
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <Card
      title={t('settings.services')}
      pad={false}
      actions={
        !readOnly && (
          <button className="btn-primary btn-sm" onClick={() => setEdit({ name: '', description: '', unit: '', unit_price: 0, is_package: false, active: true })}>
            <Plus className="h-4 w-4" /> {t('settings.addService')}
          </button>
        )
      }
    >
      <p className="px-4 pt-3 text-sm text-slate-500">{t('settings.servicesHint')}</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">{t('reports.service')}</th>
              <th className="th hidden md:table-cell">{t('items.description')}</th>
              <th className="th">{t('items.unit')}</th>
              <th className="th text-right">{t('items.unitPrice')}</th>
              <th className="th">{t('common.status')}</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(services || []).map((s) => (
              <tr key={s.id} className={s.active ? '' : 'opacity-50'}>
                <td className="td font-medium">
                  {s.name} {s.is_package ? <Badge tone="violet">{t('settings.package')}</Badge> : null}
                </td>
                <td className="td hidden max-w-xs truncate md:table-cell">{s.description || '-'}</td>
                <td className="td">{s.unit || '-'}</td>
                <td className="td num text-right">{fmtRM(s.unit_price)}</td>
                <td className="td">{s.active ? <Badge tone="green">{t('settings.active')}</Badge> : <Badge>{t('settings.inactive')}</Badge>}</td>
                <td className="td whitespace-nowrap text-right">
                  {!readOnly && (
                    <>
                      <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setEdit({ ...s, is_package: !!s.is_package, active: !!s.active })} title={t('common.edit')}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => remove(s)} title={t('common.delete')}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!services?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  {t('settings.noServices')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? t('settings.editService') : t('settings.addService')}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEdit(null)}>
              {t('common.cancel')}
            </button>
            <button className="btn-primary" onClick={save}>
              {t('common.save')}
            </button>
          </>
        }
      >
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('reports.service')} required className="sm:col-span-2">
              <input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus />
            </Field>
            <Field label={t('items.description')} className="sm:col-span-2">
              <textarea className="input" rows={2} value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </Field>
            <Field label={t('items.unit')}>
              <input className="input" value={edit.unit || ''} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} placeholder="pakej / jam / pax" />
            </Field>
            <Field label={t('items.unitPrice')}>
              <MoneyInput value={edit.unit_price} onChange={(v) => setEdit({ ...edit, unit_price: v })} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={edit.is_package} onChange={(e) => setEdit({ ...edit, is_package: e.target.checked })} /> {t('settings.isPackage')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> {t('settings.active')}
            </label>
          </div>
        )}
      </Modal>
    </Card>
  );
}

function UsersTab() {
  const { t } = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { data: users, setData, loading } = useFetch('/users');
  const [edit, setEdit] = useState(null);
  const save = async () => {
    try {
      setData(edit.id ? await put(`/users/${edit.id}`, edit) : await post('/users', edit));
      toast.success(t('common.saved'));
      setEdit(null);
    } catch (e) {
      toast.error(e);
    }
  };
  const remove = async (u) => {
    if (!(await confirm({ title: t('settings.deleteUser'), message: `${u.name} (${u.email})`, danger: true, confirmText: t('common.delete') }))) return;
    try {
      setData(await del(`/users/${u.id}`));
    } catch (e) {
      toast.error(e);
    }
  };
  if (loading && !users) return <Loading />;
  return (
    <Card
      title={t('settings.users')}
      pad={false}
      actions={
        <button className="btn-primary btn-sm" onClick={() => setEdit({ name: '', email: '', password: '', role: 'staff', active: true })}>
          <UserPlus className="h-4 w-4" /> {t('settings.addUser')}
        </button>
      }
    >
      <p className="px-4 pt-3 text-sm text-slate-500">{t('settings.rolesHint')}</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">{t('auth.yourName')}</th>
              <th className="th">{t('auth.email')}</th>
              <th className="th">{t('settings.role')}</th>
              <th className="th hidden md:table-cell">{t('settings.lastLogin')}</th>
              <th className="th">{t('common.status')}</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(users || []).map((u) => (
              <tr key={u.id}>
                <td className="td font-medium">{u.name}</td>
                <td className="td">{u.email}</td>
                <td className="td">
                  <Badge tone={u.role === 'admin' ? 'violet' : 'slate'}>{t(`role.${u.role}`)}</Badge>
                </td>
                <td className="td hidden md:table-cell">{fmtDateTime(u.last_login_at)}</td>
                <td className="td">{u.active ? <Badge tone="green">{t('settings.active')}</Badge> : <Badge tone="red">{t('settings.inactive')}</Badge>}</td>
                <td className="td whitespace-nowrap text-right">
                  <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => setEdit({ ...u, active: !!u.active, password: '' })}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  {u.id !== user.id && (
                    <button className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => remove(u)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? t('settings.editUser') : t('settings.addUser')}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEdit(null)}>
              {t('common.cancel')}
            </button>
            <button className="btn-primary" onClick={save}>
              {t('common.save')}
            </button>
          </>
        }
      >
        {edit && (
          <div className="grid gap-4">
            <Field label={t('auth.yourName')} required>
              <input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label={t('auth.email')} required>
              <input className="input" type="email" value={edit.email} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
            </Field>
            <Field label={edit.id ? t('settings.resetPassword') : t('auth.password')} required={!edit.id} hint={t('auth.passwordHint')}>
              <input className="input" type="password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} autoComplete="new-password" />
            </Field>
            <Field label={t('settings.role')}>
              <select className="input" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>
                <option value="staff">{t('role.staff')}</option>
                <option value="admin">{t('role.admin')}</option>
              </select>
            </Field>
            {edit.id && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> {t('settings.active')}
              </label>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}

function BackupTab() {
  const { t } = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const { reload } = useSettings();
  const { data: files, reload: reloadFiles } = useFetch('/backup/files');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const exportJson = async () => {
    setBusy(true);
    try {
      const data = await get('/backup/export');
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `bms-backup-${todayISO()}.json`);
      toast.success(t('backup.downloaded'));
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  const restore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let payload;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      return toast.error(t('backup.invalidFile'));
    }
    const counts = payload?.data ? `${payload.data.customers?.length ?? 0} ${t('nav.customers')}, ${payload.data.bookings?.length ?? 0} ${t('nav.bookings')}, ${payload.data.invoices?.length ?? 0} ${t('nav.invoices')}` : '';
    if (!(await confirm({ title: t('backup.restoreTitle'), message: t('backup.restoreMsg', { date: fmtDateTime(payload?.exported_at), counts }), danger: true, confirmText: t('backup.restore') }))) return;
    setBusy(true);
    try {
      await post('/backup/restore', payload);
      toast.success(t('backup.restored'));
      await reload();
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };
  const snapshot = async () => {
    setBusy(true);
    try {
      await post('/backup/files');
      toast.success(t('backup.snapshotCreated'));
      reloadFiles();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title={t('backup.export')}>
        <p className="mb-4 text-sm text-slate-600">{t('backup.exportHint')}</p>
        <button className="btn-primary" onClick={exportJson} disabled={busy}>
          <Download className="h-4 w-4" /> {t('backup.downloadJson')}
        </button>
      </Card>
      <Card title={t('backup.restore')}>
        <p className="mb-4 text-sm text-slate-600">{t('backup.restoreHint')}</p>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={restore} />
        <button className="btn-danger" onClick={() => fileRef.current?.click()} disabled={busy}>
          <DatabaseBackup className="h-4 w-4" /> {t('backup.chooseFile')}
        </button>
      </Card>
      <Card title={t('backup.snapshots')} className="lg:col-span-2" actions={<button className="btn-secondary btn-sm" onClick={snapshot} disabled={busy}><HardDriveDownload className="h-4 w-4" /> {t('backup.createSnapshot')}</button>}>
        <p className="mb-3 text-sm text-slate-600">{t('backup.snapshotsHint')}</p>
        {!files?.length ? (
          <p className="text-sm text-slate-400">{t('backup.noSnapshots')}</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {files.map((f) => (
              <li key={f.name} className="flex items-center justify-between py-2">
                <span className="font-mono text-xs">{f.name}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{(f.size / 1024).toFixed(0)} KB</span>
                  <a className="text-brand-700 hover:underline" href={`/api/backup/files/${encodeURIComponent(f.name)}`}>
                    <Download className="h-4 w-4" />
                  </a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
