import { rememberLastPosUrl } from '@/lib/offline/pos-shell-storage';

import { HTML_PAGES_CACHE, POS_ROUTE_CACHE, RSC_PAGES_CACHE } from '@/lib/offline/sw-cache-names';

const PAGES_CACHE = HTML_PAGES_CACHE;
const RSC_CACHE = RSC_PAGES_CACHE;

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
  const pathnameOnly = `${url.origin}${url.pathname}`;
  const keys = [requestUrl, pathnameOnly];
  for (const key of keys) {
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

function pathnameOnly(url: URL) {
  return `${url.origin}${url.pathname}`;
}

async function warmRscVariants(documentUrl: string) {
  const url = new URL(documentUrl);
  const headerSets: Array<Record<string, string>> = [
    { RSC: '1', 'Next-Router-Prefetch': '1' },
    { RSC: '1' },
  ];

  for (const headers of headerSets) {
    try {
      const rscResponse = await fetch(documentUrl, {
        credentials: 'same-origin',
        cache: 'no-cache',
        headers,
      });
      if (rscResponse.ok) {
        await putInCache(RSC_CACHE, documentUrl, rscResponse);
        await putInCache(POS_ROUTE_CACHE, documentUrl, rscResponse);
        const controller = navigator.serviceWorker?.controller;
        controller?.postMessage({
          type: 'CACHE_POS_RSC',
          url: documentUrl,
          headers,
        });
      }
    } catch {
      /* ignore */
    }
  }

  const rscQuery = `${pathnameOnly(url)}?_rsc=${Date.now().toString(36)}`;
  try {
    const rscResponse = await fetch(rscQuery, {
      credentials: 'same-origin',
      headers: { RSC: '1' },
    });
    if (rscResponse.ok) {
      await putInCache(POS_ROUTE_CACHE, rscQuery, rscResponse);
    }
  } catch {
    /* ignore */
  }
}

/** Persist the POS document and RSC flight payloads for offline hard reloads. */
export async function warmPosShellCache(pathname: string, href?: string) {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  rememberLastPosUrl(pathname);
  const documentUrl = normalizeDocumentUrl(href ?? window.location.href);

  try {
    const docResponse = await fetch(documentUrl, {
      credentials: 'same-origin',
      cache: 'no-cache',
    });
    await putInCache(PAGES_CACHE, documentUrl, docResponse);
    await putInCache(POS_ROUTE_CACHE, documentUrl, docResponse);
  } catch {
    /* ignore */
  }

  await warmRscVariants(documentUrl);

  const controller = navigator.serviceWorker?.controller;
  if (controller) {
    controller.postMessage({ type: 'CACHE_POS_URL', url: documentUrl });
    const pathnameOnly = new URL(documentUrl).origin + new URL(documentUrl).pathname;
    if (pathnameOnly !== documentUrl) {
      controller.postMessage({ type: 'CACHE_POS_URL', url: pathnameOnly });
    }
  }
}

/** Record live RSC responses the App Router fetches while online (exact cache keys). */
export function startPosRscCapture(slug: string) {
  if (typeof window === 'undefined' || !navigator.serviceWorker?.controller) return () => undefined;

  const pathname = `/${slug}/orders/new`;

  const observer = new PerformanceObserver((list) => {
    if (!navigator.onLine) return;
    for (const entry of list.getEntries()) {
      const res = entry as PerformanceResourceTiming;
      if (res.initiatorType !== 'fetch' && res.initiatorType !== 'other') continue;
      if (!res.name.includes(pathname)) continue;
      if (!res.name.includes('_rsc') && !res.name.includes('RSC')) continue;
      void fetch(res.name, { credentials: 'same-origin', headers: { RSC: '1' } })
        .then(async (response) => {
          if (!response.ok) return;
          const posCache = await caches.open(POS_ROUTE_CACHE);
          await posCache.put(res.name, response);
          const rscCache = await caches.open(RSC_CACHE);
          await rscCache.put(res.name, response);
        })
        .catch(() => undefined);
    }
  });

  try {
    observer.observe({ type: 'resource', buffered: true });
  } catch {
    return () => undefined;
  }

  return () => observer.disconnect();
}