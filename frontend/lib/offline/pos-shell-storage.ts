export const LAST_POS_URL_KEY = 'venta:last-pos-url';

export function rememberLastPosUrl(pathname: string) {
  if (typeof window === 'undefined') return;
  if (!pathname.includes('/orders/new')) return;
  try {
    localStorage.setItem(LAST_POS_URL_KEY, pathname);
  } catch {
    /* ignore */
  }
}

export function readLastPosUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_POS_URL_KEY);
    if (!raw?.startsWith('/')) return null;
    if (!raw.includes('/orders/new')) return null;
    return raw;
  } catch {
    return null;
  }
}
