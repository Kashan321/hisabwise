import { rememberLastPosUrl } from '@/lib/offline/pos-shell-storage';
import {
  documentCacheKey,
  isHtmlContentType,
  isRscContentType,
  rscCacheKey,
} from '@/lib/offline/cache-flight';
import { HTML_PAGES_CACHE, RSC_PAGES_CACHE } from '@/lib/offline/sw-cache-names';

function normalizeDocumentUrl(href: string) {
  const url = new URL(href, typeof window !== 'undefined' ? window.location.origin : undefined);
  url.hash = '';
  return url.href;
}

async function putHtmlOnly(cacheName: string, requestUrl: string, response: Response) {
  if (!response.ok || response.redirected) return;
  const ct = response.headers.get('content-type') ?? '';
  if (!isHtmlContentType(ct) || isRscContentType(ct)) return;
  const cache = await caches.open(cacheName);
  const body = await response.blob();
  const url = new URL(requestUrl);
  const pathnameOnly = documentCacheKey(url);
  const stored = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  await cache.put(requestUrl, stored.clone());
  await cache.put(pathnameOnly, stored);
}

async function putRscOnly(requestUrl: string, response: Response, headers: Record<string, string>) {
  if (!response.ok) return;
  const ct = response.headers.get('content-type') ?? '';
  if (!isRscContentType(ct) && !ct.includes('text/plain')) return;
  const cache = await caches.open(RSC_PAGES_CACHE);
  const body = await response.blob();
  const stored = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  await cache.put(rscCacheKey(requestUrl, headers), stored.clone());
  await cache.put(requestUrl, stored);
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
        await putRscOnly(documentUrl, rscResponse, headers);
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

  const rscQuery = `${documentCacheKey(url)}?_rsc=${Date.now().toString(36)}`;
  try {
    const rscResponse = await fetch(rscQuery, {
      credentials: 'same-origin',
      headers: { RSC: '1' },
    });
    if (rscResponse.ok) {
      await putRscOnly(rscQuery, rscResponse, { RSC: '1' });
    }
  } catch {
    /* ignore */
  }
}

/** Persist a tenant route document + RSC flight payloads for offline navigation and hard reloads. */
export async function warmTenantShellCache(pathname: string, href?: string) {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  rememberLastPosUrl(pathname);
  const documentUrl = normalizeDocumentUrl(href ?? window.location.href);

  try {
    const docResponse = await fetch(documentUrl, {
      credentials: 'same-origin',
      cache: 'no-cache',
      headers: { Accept: 'text/html' },
    });
    await putHtmlOnly(HTML_PAGES_CACHE, documentUrl, docResponse);
  } catch {
    /* ignore */
  }

  await warmRscVariants(documentUrl);

  const controller = navigator.serviceWorker?.controller;
  if (controller) {
    controller.postMessage({ type: 'CACHE_POS_URL', url: documentUrl });
    const pathnameOnly = documentCacheKey(new URL(documentUrl));
    if (pathnameOnly !== documentUrl) {
      controller.postMessage({ type: 'CACHE_POS_URL', url: pathnameOnly });
    }
  }
}

/** @deprecated alias */
export const warmPosShellCache = warmTenantShellCache;

/** Record live RSC responses the App Router fetches while online (exact cache keys). */
export function startTenantRscCapture(slug: string) {
  if (typeof window === 'undefined' || !navigator.serviceWorker?.controller) return () => undefined;

  const prefix = `/${slug}/`;

  const observer = new PerformanceObserver((list) => {
    if (!navigator.onLine) return;
    for (const entry of list.getEntries()) {
      const res = entry as PerformanceResourceTiming;
      if (res.initiatorType !== 'fetch' && res.initiatorType !== 'other') continue;
      if (!res.name.includes(prefix)) continue;
      if (!res.name.includes('_rsc') && !res.name.includes('RSC')) continue;
      void fetch(res.name, { credentials: 'same-origin', headers: { RSC: '1' } })
        .then(async (response) => {
          if (!response.ok) return;
          await putRscOnly(res.name, response, { RSC: '1' });
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

export const startPosRscCapture = startTenantRscCapture;