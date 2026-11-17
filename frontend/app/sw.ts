import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkOnly, Serwist } from 'serwist';
import {
  documentCacheKey,
  isHtmlContentType,
  isHtmlDocumentRequest,
  isRscContentType,
  isRscFetchFromRequest,
  isValidCachedHtml,
  isValidCachedRsc,
  rscCacheKey,
} from '../lib/offline/cache-flight';
import {
  HTML_PAGES_CACHE,
  LEGACY_RUNTIME_CACHE_NAMES,
  RSC_PAGES_CACHE,
} from '../lib/offline/sw-cache-names';

type WorkerFetchEvent = Event & {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
};

const SHELL_PATHS = ['/offline-pos', '/offline', '/login'] as const;

function isSameOriginAppUrl(url: URL): boolean {
  return url.origin === self.location.origin;
}

const TENANT_SHELL =
  /^\/[^/]+\/(orders|kitchen|menu|dashboard|tables|inventory|staff|reports|waiter|floor-plan|settings|terminal|display|cashier|shifts|business-days|delivery|customers|promotions|qr|feedback|subscription|reservations)(\/|$)/;

function isNewOrderShellPath(pathname: string): boolean {
  return /^\/[^/]+\/(orders\/new|waiter\/orders\/new)\/?$/.test(pathname);
}

function isTenantShellPath(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/' || pathname === '/offline' || pathname === '/offline-status') {
    return true;
  }
  if (pathname.startsWith('/platform')) return false;
  return TENANT_SHELL.test(pathname);
}

function shouldPurgeCacheName(name: string): boolean {
  if ((LEGACY_RUNTIME_CACHE_NAMES as readonly string[]).includes(name)) return true;
  if (name.startsWith('pages') && name !== HTML_PAGES_CACHE) return true;
  if (name.startsWith('pages-rsc') && name !== RSC_PAGES_CACHE) return true;
  return false;
}

async function purgeLegacyCaches(): Promise<void> {
  const keys = await caches.keys();
  await Promise.all(keys.filter(shouldPurgeCacheName).map((k) => caches.delete(k)));
}

async function readCachedDocument(request: Request, url: URL): Promise<Response | undefined> {
  const pathnameKey = documentCacheKey(url);
  const cache = await caches.open(HTML_PAGES_CACHE);
  const hits = [
    await cache.match(request, { ignoreSearch: true, ignoreVary: false }),
    await cache.match(pathnameKey, { ignoreSearch: true, ignoreVary: false }),
    await cache.match(request.url, { ignoreSearch: true, ignoreVary: false }),
  ];
  for (const hit of hits) {
    if (hit && isValidCachedHtml(hit)) return hit;
  }
  return undefined;
}

async function readCachedRsc(request: Request, url: URL): Promise<Response | undefined> {
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => {
    headers[k] = v;
  });
  const cache = await caches.open(RSC_PAGES_CACHE);
  const keys = [
    rscCacheKey(request.url, headers),
    request.url,
    `${url.origin}${url.pathname}${url.search}`,
  ];
  for (const key of keys) {
    const hit = await cache.match(key, { ignoreVary: false });
    if (hit && isValidCachedRsc(hit)) return hit;
  }
  return undefined;
}

async function precachedShell(path: string): Promise<Response | undefined> {
  return serwist.matchPrecache(path);
}

async function offlineNavigateResponse(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (!isSameOriginAppUrl(url) || url.pathname.startsWith('/api/')) {
    try {
      return await fetch(request);
    } catch {
      return (await precachedShell('/offline')) ?? new Response('Offline', { status: 503 });
    }
  }

  if (isRscFetchFromRequest(request)) {
    const rsc = await readCachedRsc(request, url);
    if (rsc) return rsc;
    try {
      return await fetch(request);
    } catch {
      return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
  }

  const cached = await readCachedDocument(request, url);
  if (cached) return cached;

  try {
    const network = await fetch(request);
    const ct = network.headers.get('content-type') ?? '';
    if (network.ok && isHtmlContentType(ct) && !isRscContentType(ct)) return network;
    if (network.status >= 300 && network.status < 400) return network;
  } catch {
    /* continue to shells */
  }

  if (isNewOrderShellPath(url.pathname)) {
    const posShell = (await precachedShell('/offline-pos')) ?? (await precachedShell('/offline'));
    if (posShell && isValidCachedHtml(posShell)) return posShell;
  }

  if (url.pathname === '/login' || url.pathname === '/') {
    const login = await precachedShell('/login');
    if (login && isValidCachedHtml(login)) return login;
  }

  if (isTenantShellPath(url.pathname)) {
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Offline</title></head><body><p>Open <strong>${url.pathname}</strong> once while online on this host, then try again.</p></body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  const offlinePage = await precachedShell('/offline');
  if (offlinePage && isValidCachedHtml(offlinePage)) return offlinePage;

  return new Response(
    '<!DOCTYPE html><html><body><p>Offline — open Hisabwise once while online on this device.</p></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

async function offlineRscResponse(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const cached = await readCachedRsc(request, url);
  if (cached) return cached;

  try {
    const network = await fetch(request);
    const ct = network.headers.get('content-type') ?? '';
    if (network.ok && (isRscContentType(ct) || ct.includes('text/plain'))) return network;
    return network;
  } catch {
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: typeof globalThis & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

type ExtendableEvent = Event & { waitUntil(promise: Promise<unknown>): void };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }: { sameOrigin: boolean; url: URL }) =>
        sameOrigin && url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
    },
    ...defaultCache.filter((entry) => {
      const handler = entry.handler as { cacheName?: string };
      const name = handler?.cacheName ?? '';
      if (name === 'pages' || name === 'pages-rsc' || name === 'pages-rsc-prefetch') return false;
      return true;
    }),
  ],
});

self.addEventListener('install', (event) => {
  (event as ExtendableEvent).waitUntil(
    (async () => {
      const html = await caches.open(HTML_PAGES_CACHE);
      for (const path of SHELL_PATHS) {
        const shell = await serwist.matchPrecache(path);
        if (!shell || !isValidCachedHtml(shell)) continue;
        const absolute = `${self.location.origin}${path}`;
        await html.put(absolute, shell.clone());
        await html.put(`${self.location.origin}${path}`, shell.clone());
      }
    })(),
  );
});

self.addEventListener('activate', (event) => {
  (event as ExtendableEvent).waitUntil(purgeLegacyCaches());
});

self.addEventListener('fetch', (event) => {
  const fetchEvent = event as WorkerFetchEvent;
  const { request } = fetchEvent;
  const url = new URL(request.url);
  if (!isSameOriginAppUrl(url)) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;

  if (isRscFetchFromRequest(request)) {
    fetchEvent.respondWith(
      offlineRscResponse(request).catch(
        () => new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }),
      ),
    );
    return;
  }

  if (isHtmlDocumentRequest(request)) {
    fetchEvent.respondWith(
      offlineNavigateResponse(request).catch(
        () =>
          new Response(
            '<!DOCTYPE html><html><body><p>Offline — reload once while online to enable caching.</p></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          ),
      ),
    );
  }
});

serwist.addEventListeners();

self.addEventListener('message', (event) => {
  const data = event.data as {
    type?: string;
    url?: string;
    headers?: Record<string, string>;
  } | null;
  if (!data?.type) return;

  if (data.type === 'SKIP_WAITING') {
    void (self as unknown as { skipWaiting: () => Promise<void> }).skipWaiting();
    return;
  }

  if (data.type === 'PURGE_LEGACY_CACHES') {
    void purgeLegacyCaches();
    return;
  }

  if (data.type === 'CACHE_POS_URL' && data.url) {
    const posUrl = data.url;
    void (async () => {
      try {
        const response = await fetch(posUrl, {
          credentials: 'same-origin',
          headers: { Accept: 'text/html' },
        });
        if (!response.ok || response.redirected) return;
        const ct = response.headers.get('content-type') ?? '';
        if (!isHtmlContentType(ct) || isRscContentType(ct)) return;
        const htmlCache = await caches.open(HTML_PAGES_CACHE);
        const url = new URL(posUrl);
        const pathnameUrl = documentCacheKey(url);
        const body = response.clone();
        await htmlCache.put(posUrl, body.clone());
        await htmlCache.put(pathnameUrl, body);
      } catch {
        /* ignore */
      }
    })();
    return;
  }

  if (data.type === 'CACHE_POS_RSC' && data.url && data.headers) {
    const rscUrl = data.url;
    const rscHeaders = data.headers as HeadersInit;
    void (async () => {
      try {
        const response = await fetch(rscUrl, {
          credentials: 'same-origin',
          headers: rscHeaders,
        });
        if (!response.ok) return;
        const ct = response.headers.get('content-type') ?? '';
        if (!isRscContentType(ct) && !ct.includes('text/plain')) return;
        const rscCache = await caches.open(RSC_PAGES_CACHE);
        const headerRecord: Record<string, string> =
          rscHeaders instanceof Headers
            ? Object.fromEntries(rscHeaders.entries())
            : (rscHeaders as Record<string, string>);
        await rscCache.put(rscCacheKey(rscUrl, headerRecord), response.clone());
        await rscCache.put(rscUrl, response.clone());
      } catch {
        /* ignore */
      }
    })();
  }
});