import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { get, post } from './api.js';
import { useT } from './i18n.jsx';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------
export function useFetch(path, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    get(path, { signal: ctrl.signal })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, error, loading: false });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((data) => setState((s) => ({ ...s, data: typeof data === 'function' ? data(s.data) : data })), []);
  return { ...state, reload, setData };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, needsSetup: false });
  const refresh = useCallback(async () => {
    try {
      const s = await get('/auth/status');
      setState({ loading: false, user: s.user, needsSetup: s.needsSetup });
    } catch {
      setState({ loading: false, user: null, needsSetup: false });
    }
  }, []);
  useEffect(() => {
    refresh();
    const onUnauth = () => setState((s) => ({ ...s, user: null }));
    window.addEventListener('bms:unauthorized', onUnauth);
    return () => window.removeEventListener('bms:unauthorized', onUnauth);
  }, [refresh]);
  const login = async (email, password) => {
    const r = await post('/auth/login', { email, password });
    setState({ loading: false, user: r.user, needsSetup: false });
  };
  const setup = async (body) => {
    const r = await post('/auth/setup', body);
    setState({ loading: false, user: r.user, needsSetup: false });
  };
  const logout = async () => {
    await post('/auth/logout').catch(() => {});
    setState({ loading: false, user: null, needsSetup: false });
  };
  const isAdmin = state.user?.role === 'admin';
  return <AuthCtx.Provider value={{ ...state, isAdmin, login, logout, setup, refresh }}>{children}</AuthCtx.Provider>;
}

// ---------------------------------------------------------------------------
// Business settings + service catalogue (loaded once after sign-in)
// ---------------------------------------------------------------------------
const SettingsCtx = createContext(null);
export const useSettings = () => useContext(SettingsCtx);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [services, setServices] = useState([]);
  const reload = useCallback(async () => {
    const [s, sv] = await Promise.all([get('/settings'), get('/services')]);
    setSettings(s);
    setServices(sv);
    return s;
  }, []);
  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);
  return <SettingsCtx.Provider value={{ settings, services, reload, setSettings }}>{children}</SettingsCtx.Provider>;
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);
  const push = useCallback((type, message) => {
    const id = ++idRef.current;
    setItems((xs) => [...xs, { id, type, message }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), type === 'error' ? 6000 : 3500);
  }, []);
  const api = useRef(null);
  api.current = {
    success: (m) => push('success', m),
    error: (m) => push('error', m?.message || String(m)),
    info: (m) => push('info', m),
  };
  const stable = useRef({
    success: (m) => api.current.success(m),
    error: (m) => api.current.error(m),
    info: (m) => api.current.info(m),
  });
  const icons = { success: CheckCircle2, error: XCircle, info: Info };
  const colors = { success: 'text-emerald-600', error: 'text-red-600', info: 'text-brand-600' };
  return (
    <ToastCtx.Provider value={stable.current}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
        {items.map((x) => {
          const Icon = icons[x.type];
          return (
            <div key={x.id} role="status" className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${colors[x.type]}`} />
              <p className="flex-1 text-sm text-slate-700">{x.message}</p>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setItems((xs) => xs.filter((y) => y.id !== x.id))} aria-label="close">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// Confirmation dialog (optionally asks for a text reason)
// ---------------------------------------------------------------------------
const ConfirmCtx = createContext(null);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }) {
  const { t } = useT();
  const [dlg, setDlg] = useState(null);
  const [text, setText] = useState('');
  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setText('');
        setDlg({ ...opts, resolve });
      }),
    [],
  );
  const close = (val) => {
    dlg?.resolve(val);
    setDlg(null);
  };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {dlg && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" role="alertdialog" aria-modal="true">
            <h3 className="text-lg font-semibold text-slate-900">{dlg.title || t('common.areYouSure')}</h3>
            {dlg.message && <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{dlg.message}</p>}
            {dlg.input && (
              <div className="mt-3">
                <label className="label">{dlg.input}</label>
                <textarea className="input" rows={2} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => close(false)}>
                {t('common.cancel')}
              </button>
              <button
                className={dlg.danger ? 'btn-danger' : 'btn-primary'}
                disabled={dlg.input && dlg.inputRequired && !text.trim()}
                onClick={() => close(dlg.input ? text.trim() || true : true)}
                autoFocus={!dlg.input}
              >
                {dlg.confirmText || t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

/** Persist unsaved form state in localStorage so nothing is lost on refresh. */
export function useDraft(key, value, enabled = true) {
  const k = `bms-draft:${key}`;
  useEffect(() => {
    if (!enabled || !key) return;
    const h = setTimeout(() => {
      try {
        localStorage.setItem(k, JSON.stringify({ at: Date.now(), value }));
      } catch {
        /* storage unavailable */
      }
    }, 500);
    return () => clearTimeout(h);
  }, [k, key, value, enabled]);
}
export function readDraft(key) {
  try {
    const raw = localStorage.getItem(`bms-draft:${key}`);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (Date.now() - d.at > 7 * 24 * 3600 * 1000) return null;
    return d.value;
  } catch {
    return null;
  }
}
export function clearDraft(key) {
  try {
    localStorage.removeItem(`bms-draft:${key}`);
  } catch {
    /* ignore */
  }
}
