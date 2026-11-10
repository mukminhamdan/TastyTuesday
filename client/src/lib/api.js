let currentLang = 'ms';
export const setApiLang = (l) => (currentLang = l);

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.error || `HTTP ${status}`);
    this.status = status;
    this.data = data || {};
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'BMS',
        'X-Lang': currentLang,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError(0, {
      error: currentLang === 'en' ? 'Unable to reach the server. Check your connection.' : 'Tidak dapat menghubungi pelayan. Semak sambungan anda.',
    });
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('bms:unauthorized'));
    throw new ApiError(res.status, data);
  }
  return data;
}

export const get = (p, opts) => api(p, opts);
export const post = (p, body) => api(p, { method: 'POST', body: body ?? {} });
export const put = (p, body) => api(p, { method: 'PUT', body });
export const del = (p) => api(p, { method: 'DELETE' });

export function qs(params) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) if (v !== undefined && v !== null && v !== '') s.set(k, v);
  const str = s.toString();
  return str ? `?${str}` : '';
}
