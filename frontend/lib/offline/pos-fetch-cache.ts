import {
  documentCacheKey,
  headerMap,
  isHtmlContentType,
  isRscContentType,
  isRscFetch,
  isValidCachedHtml,
  isValidCachedRsc,
  rscCacheKey,
} from '@/lib/offline/cache-flight';
import { HTML_PAGES_CACHE, RSC_PAGES_CACHE } from '@/lib/offline/sw-cache-names';

let installed = false;

function resolveRequestUrl(input: RequestInfo | URL, init?: RequestInit): string | null {
  try {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    return new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined).href;
  } catch {
    return null;
  }
}

function isTenantAppPath(pathname: string): boolean {
  if (pathname.startsWith('/platform') || pathname.startsWith('/api')) return false;
  return /^\/[^/]+\/[^/]+/.test(pathname) || pathname === '/login';
}

async function readCachedHtml(url: string): Promise<Response | null> {
  const parsed = new URL(url);
  const pathnameKey = documentCacheKey(parsed);
  const cache = await caches.open(HTML_PAGES_CACHE);
  for (const key of [url, pathnameKey]) {
    const hit = await cache.match(key, { ignoreVary: false });
    if (hit && isValidCachedHtml(hit)) return hit;
  }
  return null;
}

async function readCachedRsc(url: string, init?: RequestInit): Promise<Response | null> {
  const headers = headerMap(init);
  const cache = await caches.open(RSC_PAGES_CACHE);
  const keys = [rscCacheKey(url, headers), url];
  const parsed = new URL(url);
  keys.push(`${parsed.origin}${parsed.pathname}${parsed.search}`);
  for (const key of keys) {
    const hit = await cache.match(key, { ignoreVary: false });
    if (hit && isValidCachedRsc(hit)) return hit;
  }
  return null;
}

async function putHtmlCache(url: string, response: Response) {
  const ct = response.headers.get('content-type') ?? '';
  if (!isHtmlContentType(ct) || isRscContentType(ct)) return;
  const parsed = new URL(url);
  const pathnameKey = documentCacheKey(parsed);
  const body = await response.clone().blob();
  const cache = await caches.open(HTML_PAGES_CACHE);
  const stored = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  await cache.put(url, stored.clone());
  await cache.put(pathnameKey, stored);
}

async function putRscCache(url: string, response: Response, init?: RequestInit) {
  const ct = response.headers.get('content-type') ?? '';
  if (!isRscContentType(ct) && !ct.includes('text/plain')) return;
  const headers = headerMap(init);
  const body = await response.clone().blob();
  const cache = await caches.open(RSC_PAGES_CACHE);
  const stored = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  const keys = new Set([rscCacheKey(url, headers), url]);
  const parsed = new URL(url);
  keys.add(`${parsed.origin}${parsed.pathname}${parsed.search}`);
  for (const key of keys) {
    await cache.put(key, stored.clone());
  }
}

async function persistOnlineResponse(url: string, response: Response, init?: RequestInit) {
  if (!response.ok || response.redirected || !navigator.onLine) return;
  const parsed = new URL(url);
  if (parsed.pathname.startsWith('/api/')) return;
  if (!isTenantAppPath(parsed.pathname) && parsed.pathname !== '/login') return;

  const headers = headerMap(init);
  if (isRscFetch(url, headers)) {
    await putRscCache(url, response, init);
    return;
  }

  const accept = headers.Accept ?? '';
  const isDocFetch = accept.includes('text/html') || (!headers.RSC && !url.includes('_rsc='));
  if (isDocFetch && isHtmlContentType(response.headers.get('content-type'))) {
    await putHtmlCache(url, response);
  }
}

export function installPosRouteFetchCache() {
  if (typeof window === 'undefined' || installed || !('fetch' in window) || !('caches' in window)) {
    return;
  }
  installed = true;
  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = resolveRequestUrl(input, init);
    const headers = headerMap(init);
    const rsc = url ? isRscFetch(url, headers) : false;
    try {
      const response = await original(input, init);
      if (url) await persistOnlineResponse(url, response, init);
      return response;
    } catch (err) {
      if (!navigator.onLine && url) {
        const hit = rsc ? await readCachedRsc(url, init) : await readCachedHtml(url);
        if (hit) return hit;
      }
      throw err;
    }
  };
}