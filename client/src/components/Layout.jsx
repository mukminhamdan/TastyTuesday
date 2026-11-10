import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CalendarDays,
  FileText,
  FileSpreadsheet,
  ReceiptText,
  Wallet,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  Languages,
  KeyRound,
  Plus,
} from 'lucide-react';
import { useT } from '../lib/i18n.jsx';
import { useAuth, useSettings, useToast } from '../lib/context.jsx';
import { Modal, Field } from './ui.jsx';
import { post } from '../lib/api.js';

export const NAV = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/customers', key: 'nav.customers', icon: Users },
  { to: '/bookings', key: 'nav.bookings', icon: ClipboardList },
  { to: '/calendar', key: 'nav.calendar', icon: CalendarDays },
  { to: '/quotations', key: 'nav.quotations', icon: FileText },
  { to: '/invoices', key: 'nav.invoices', icon: FileSpreadsheet },
  { to: '/receipts', key: 'nav.receipts', icon: ReceiptText },
  { to: '/payments', key: 'nav.payments', icon: Wallet },
  { to: '/reports', key: 'nav.reports', icon: BarChart3 },
  { to: '/settings', key: 'nav.settings', icon: Settings },
];

function LangToggle({ className = '' }) {
  const { lang, setLang } = useT();
  return (
    <div className={`inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold ${className}`} role="group" aria-label="Language">
      <Languages className="mx-1 h-3.5 w-3.5 text-slate-400" />
      {['ms', 'en'].map((l) => (
        <button key={l} onClick={() => setLang(l)} className={`rounded-md px-2 py-1 ${lang === l ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          {l === 'ms' ? 'BM' : 'EN'}
        </button>
      ))}
    </div>
  );
}

function Sidebar({ onNavigate }) {
  const { t } = useT();
  const { settings } = useSettings();
  const { user, logout } = useAuth();
  const [pwOpen, setPwOpen] = useState(false);
  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-3 px-4 py-4">
        {settings?.logo ? (
          <img src={settings.logo} alt="" className="h-9 w-9 rounded-md bg-white object-contain p-0.5" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600 font-bold text-white">{(settings?.business_name || 'B').charAt(0)}</div>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{settings?.business_name || '...'}</div>
          <div className="text-[11px] text-slate-400">{t('app.tagline')}</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-brand-700 text-white' : 'hover:bg-slate-800 hover:text-white'}`
            }
          >
            <n.icon className="h-[18px] w-[18px] shrink-0" />
            {t(n.key)}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <div className="mb-2 flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">{user?.name?.charAt(0)}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-white">{user?.name}</div>
            <div className="text-[11px] text-slate-400">{t(`role.${user?.role}`)}</div>
          </div>
        </div>
        <div className="flex gap-1">
          <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs hover:bg-slate-800 hover:text-white" onClick={() => setPwOpen(true)}>
            <KeyRound className="h-3.5 w-3.5" /> {t('auth.password')}
          </button>
          <button className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs hover:bg-slate-800 hover:text-white" onClick={logout}>
            <LogOut className="h-3.5 w-3.5" /> {t('auth.logout')}
          </button>
        </div>
      </div>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

function ChangePasswordModal({ open, onClose }) {
  const { t } = useT();
  const toast = useToast();
  const [f, setF] = useState({ current_password: '', new_password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (f.new_password !== f.confirm) return toast.error(t('auth.passwordMismatch'));
    setBusy(true);
    try {
      await post('/auth/change-password', f);
      toast.success(t('auth.passwordChanged'));
      setF({ current_password: '', new_password: '', confirm: '' });
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={t('auth.changePassword')} size="sm">
      <form onSubmit={submit} className="space-y-3">
        <Field label={t('auth.currentPassword')} required>
          <input type="password" className="input" value={f.current_password} onChange={(e) => setF({ ...f, current_password: e.target.value })} required autoComplete="current-password" />
        </Field>
        <Field label={t('auth.newPassword')} required hint={t('auth.passwordHint')}>
          <input type="password" className="input" value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label={t('auth.confirmPassword')} required>
          <input type="password" className="input" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required autoComplete="new-password" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary" disabled={busy}>
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Layout() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [quick, setQuick] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const quickRef = useRef(null);
  useEffect(() => {
    if (!quick) return;
    const h = (e) => !quickRef.current?.contains(e.target) && setQuick(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [quick]);
  useEffect(() => {
    setOpen(false);
    setQuick(false);
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  const current = NAV.find((n) => (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)));
  const quickItems = [
    ['/customers?new=1', 'quick.customer'],
    ['/bookings/new', 'quick.booking'],
    ['/quotations/new', 'quick.quotation'],
    ['/invoices/new', 'quick.invoice'],
    ['/payments?record=1', 'quick.payment'],
  ];

  return (
    <div className="min-h-full lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar />
      </aside>
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-xl">
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
          <button className="absolute right-3 top-3 rounded-md bg-white/10 p-2 text-white" onClick={() => setOpen(false)} aria-label="close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        <button className="-ml-1 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="truncate text-sm font-semibold text-slate-700 lg:hidden">{current ? t(current.key) : ''}</div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative" ref={quickRef}>
            <button className="btn-primary btn-sm sm:px-3 sm:py-1.5" onClick={() => setQuick((q) => !q)} aria-expanded={quick}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t('quick.new')}</span>
            </button>
            {quick && (
              <div className="absolute right-0 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                {quickItems.map(([to, key]) => (
                  <button key={to} className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100" onClick={() => nav(to)}>
                    {t(key)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <LangToggle />
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}

export { LangToggle };
