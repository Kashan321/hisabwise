import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from 'serwist';

type WorkerFetchEvent = Event & {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
};

const HTML_CACHE = 'pages';
const RSC_CACHE = 'pages-rsc';
const POS_ROUTE_CACHE = 'pos-route-explicit';

async function offlinePosNavigateResponse(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const htmlCache = await caches.open(HTML_CACHE);
  const posCache = await caches.open(POS_ROUTE_CACHE);
  const pathnameKey = `${url.origin}${url.pathname}`;
  const cached =
    (await htmlCache.match(request, { ignoreSearch: true })) ??
    (await htmlCache.match(pathnameKey, { ignoreSearch: true })) ??
    (await posCache.match(request, { ignoreSearch: true })) ??
    (await posCache.match(pathnameKey, { ignoreSearch: true }));

  if (cached) return cached;

  try {
    return await fetch(request);
  } catch {
    const shell = await caches.match(`${url.origin}/offline-pos`);
    if (shell) {
      return Response.redirect(`${url.origin}/offline-pos`, 302);
    }
    throw new Error('POS document unavailable offline');
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

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }: { sameOrigin: boolean; url: URL }) =>
        sameOrigin && url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({
        request,
        sameOrigin,
        url,
      }: {
        request: Request;
        sameOrigin: boolean;
        url: URL;
      }) =>
        sameOrigin &&
        request.method === 'GET' &&
        url.pathname.includes('/orders/new'),
      handler: new CacheFirst({
        cacheName: POS_ROUTE_CACHE,
        matchOptions: { ignoreSearch: false, ignoreVary: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({
        request,
        sameOrigin,
        url,
      }: {
        request: Request;
        sameOrigin: boolean;
        url: URL;
      }) =>
        sameOrigin &&
        request.mode === 'navigate' &&
        url.pathname.includes('/orders/new'),
      handler: new CacheFirst({
        cacheName: HTML_CACHE,
        matchOptions: { ignoreSearch: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 16,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({
        request,
        sameOrigin,
        url,
      }: {
        request: Request;
        sameOrigin: boolean;
        url: URL;
      }) =>
        sameOrigin &&
        request.headers.get('RSC') === '1' &&
        url.pathname.includes('/orders/new'),
      handler: new CacheFirst({
        cacheName: RSC_CACHE,
        matchOptions: { ignoreSearch: false },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 48,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({
        request,
        sameOrigin,
        url,
      }: {
        request: Request;
        sameOrigin: boolean;
        url: URL;
      }) =>
        sameOrigin &&
        request.mode === 'navigate' &&
        !url.pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: HTML_CACHE,
        networkTimeoutSeconds: 2,
        matchOptions: { ignoreSearch: true },
      }),
    },
    {
      matcher: ({
        request,
        sameOrigin,
        url,
      }: {
        request: Request;
        sameOrigin: boolean;
        url: URL;
      }) =>
        sameOrigin &&
        request.headers.get('RSC') === '1' &&
        !url.pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: RSC_CACHE,
        networkTimeoutSeconds: 2,
        matchOptions: { ignoreSearch: false },
      }),
    },
    ...defaultCache,
  ],
  // No global navigate fallback — POS must load at /{slug}/orders/new from cache (see pos-route-all).
});

self.addEventListener('fetch', (event) => {
  const fetchEvent = event as WorkerFetchEvent;
  const url = new URL(fetchEvent.request.url);
  const isPosNavigate =
    fetchEvent.request.mode === 'navigate' && url.pathname.includes('/orders/new');
  const isRsc = fetchEvent.request.headers.get('RSC') === '1';

  if (!isPosNavigate && !isRsc) return;

  fetchEvent.respondWith(
    (async () => {
      if (isPosNavigate) return offlinePosNavigateResponse(fetchEvent.request);
      try {
        return await fetch(fetchEvent.request);
      } catch {
        const cachesToTry = [POS_ROUTE_CACHE, RSC_CACHE, HTML_CACHE];
        for (const cacheName of cachesToTry) {
          const cache = await caches.open(cacheName);
          const hit =
            (await cache.match(fetchEvent.request)) ??
            (await cache.match(`${url.origin}${url.pathname}`, { ignoreSearch: true }));
          if (hit) return hit;
        }
        throw new Error('Flight payload unavailable offline');
      }
    })(),
  );
});

serwist.addEventListeners();

self.addEventListener('message', (event) => {
  const data = event.data as {
    type?: string;
    url?: string;
    pathname?: string;
    headers?: Record<string, string>;
  } | null;
  if (!data?.type) return;

  if (data.type === 'CACHE_POS_URL' && data.url) {
    const posUrl = data.url;
    void (async () => {
      try {
        const response = await fetch(posUrl, { credentials: 'same-origin' });
        if (!response.ok || response.redirected) return;
        const htmlCache = await caches.open(HTML_CACHE);
        const posCache = await caches.open(POS_ROUTE_CACHE);
        const url = new URL(posUrl);
        const pathnameUrl = `${url.origin}${url.pathname}`;
        await htmlCache.put(posUrl, response.clone());
        await htmlCache.put(pathnameUrl, response.clone());
        await posCache.put(posUrl, response.clone());
        await posCache.put(pathnameUrl, response.clone());
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
        const rscCache = await caches.open(RSC_CACHE);
        const posCache = await caches.open(POS_ROUTE_CACHE);
        await rscCache.put(rscUrl, response.clone());
        await posCache.put(rscUrl, response.clone());
      } catch {
        /* ignore */
      }
    })();
  }
});