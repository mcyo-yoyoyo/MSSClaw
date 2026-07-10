/** localStorage key for runtime API override (Settings → Runtime) */
export const LS_API_KEY = 'mssclaw_api';

/** Resolve API base at call time — localStorage override wins over Vite env */
export function getApiBase(): string {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LS_API_KEY)?.trim();
    if (stored) return stored.replace(/\/$/, '');
  }
  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
}

export function isApiEnabled() {
  return Boolean(getApiBase());
}

export function apiUrl(path: string) {
  const base = getApiBase();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
