import { useState } from 'react';
import { useT } from '../lib/i18n.jsx';
import { useAuth } from '../lib/context.jsx';
import { Field } from '../components/ui.jsx';
import { LangToggle } from '../components/Layout.jsx';

function Shell({ title, subtitle, children }) {
  const { t } = useT();
  const { branding } = useAuth();
  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-slate-900 via-brand-900 to-slate-800 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          {branding?.logo ? (
            <img src={branding.logo} alt="" className="mx-auto mb-3 h-24 w-24 rounded-full bg-white object-contain p-1 shadow-lg" />
          ) : (
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <svg viewBox="0 0 32 32" className="h-7 w-7">
                <path d="M9 10h14M9 16h14M9 22h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </div>
          )}
          <h1 className="text-xl font-bold">{branding?.business_name || t('app.name')}</h1>
          <p className="text-sm text-slate-300">{branding?.business_name ? t('app.name') : t('app.subtitle')}</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
            </div>
            <LangToggle />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { t } = useT();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title={t('auth.login')} subtitle={t('auth.loginSubtitle')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('auth.email')}>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" autoFocus />
        </Field>
        <Field label={t('auth.password')}>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </Field>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full py-2.5" disabled={busy}>
          {t('auth.login')}
        </button>
      </form>
    </Shell>
  );
}

export function Setup() {
  const { t } = useT();
  const { setup, branding, setupCodeRequired } = useAuth();
  const [f, setF] = useState({ setup_code: '', business_name: branding?.business_name || '', name: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (f.password !== f.confirm) return setErr(t('auth.passwordMismatch'));
    setErr('');
    setBusy(true);
    try {
      await setup(f);
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title={t('auth.setupTitle')} subtitle={t('auth.setupSubtitle')}>
      <form onSubmit={submit} className="space-y-4">
        {setupCodeRequired && (
          <Field label={t('auth.setupCode')} required hint={t('auth.setupCodeHint')}>
            <input className="input" value={f.setup_code} onChange={set('setup_code')} required autoComplete="off" />
          </Field>
        )}
        <Field label={t('settings.businessName')} required>
          <input className="input" value={f.business_name} onChange={set('business_name')} required autoFocus />
        </Field>
        <Field label={t('auth.yourName')} required>
          <input className="input" value={f.name} onChange={set('name')} required />
        </Field>
        <Field label={t('auth.email')} required>
          <input className="input" type="email" value={f.email} onChange={set('email')} required autoComplete="username" />
        </Field>
        <Field label={t('auth.password')} required hint={t('auth.passwordHint')}>
          <input className="input" type="password" value={f.password} onChange={set('password')} required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label={t('auth.confirmPassword')} required>
          <input className="input" type="password" value={f.confirm} onChange={set('confirm')} required autoComplete="new-password" />
        </Field>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full py-2.5" disabled={busy}>
          {t('auth.createAccount')}
        </button>
      </form>
    </Shell>
  );
}
