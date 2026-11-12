import { rememberLastPosUrl } from '@/lib/offline/pos-shell-storage';

const PAGES_CACHE = 'pages';
const RSC_CACHE = 'pages-rsc';

function normalizeDocumentUrl(href: string) {
  const url = new URL(href, typeof window !== 'undefined' ? window.location.origin : undefined);
  url.hash = '';
  return url.href;
}

async function putInCache(cacheName: string, requestUrl: string, response: Response) {
  if (!response.ok || response.redirected) return;
  const cache = await caches.open(cacheName);
  const body = await response.blob();
  const url = new URL(requestUrl);
  const variants = [requestUrl, `${url.origin}${url.pathname}`, url.href];
  const unique = [...new Set(variants)];
  for (const key of unique) {
    await cache.put(
      key,
      new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }),
    );
  }
}

/** Persist the POS document (and best-effort RSC) for offline hard reloads. */
export async function warmPosShellCache(pathname: string) {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  rememberLastPosUrl(pathname);
  const documentUrl = normalizeDocumentUrl(window.location.href);

  try {
    const docResponse = await fetch(documentUrl, {
      credentials: 'same-origin',
      cache: 'no-cache',
    });
    await putInCache(PAGES_CACHE, documentUrl, docResponse);
  } catch {
    /* ignore */
  }

  try {
    const rscResponse = await fetch(documentUrl, {
      credentials: 'same-origin',
      cache: 'no-cache',
      headers: {
        RSC: '1',
        'Next-Router-Prefetch': '1',
      },
    });
    await putInCache(RSC_CACHE, documentUrl, rscResponse);
  } catch {
    /* ignore */
  }

  const controller = navigator.serviceWorker?.controller;
  if (controller) {
    controller.postMessage({ type: 'CACHE_POS_URL', url: documentUrl });
  }

  try {
    const shellUrl = new URL('/offline-pos', window.location.origin).href;
    const shellResponse = await fetch(shellUrl, { credentials: 'same-origin', cache: 'no-cache' });
    await putInCache(PAGES_CACHE, shellUrl, shellResponse);
  } catch {
    /* ignore */
  }
}
