import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setApiLang } from './api.js';
import { DICT } from './dict.js';

const LangCtx = createContext(null);

function initialLang() {
  try {
    const saved = localStorage.getItem('bms-lang');
    if (saved === 'en' || saved === 'ms') return saved;
  } catch {
    /* ignore */
  }
  return 'ms';
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);
  useEffect(() => {
    setApiLang(lang);
    document.documentElement.lang = lang;
    document.title = lang === 'en' ? 'Business Management System' : 'Sistem Pengurusan Perniagaan';
  }, [lang]);
  const setLang = useCallback((l) => {
    setLangState(l);
    try {
      localStorage.setItem('bms-lang', l);
    } catch {
      /* ignore */
    }
  }, []);
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

/** Translate `key` for a given language. Vars replace {name} placeholders. */
export function translate(lang, key, vars) {
  const entry = DICT[key];
  let s = entry ? entry[lang === 'en' ? 1 : 0] : key.includes('.') ? key.split('.').slice(1).join('.') : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

export function useT() {
  const { lang, setLang } = useContext(LangCtx);
  return useMemo(() => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }), [lang, setLang]);
}
