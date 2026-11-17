import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from 'serwist';

type WorkerFetchEvent = Event & {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
};

/** Keep in sync with `lib/offline/sw-cache-names.ts`. */
const HTML_CACHE = 'pages';
const RSC_CACHE = 'pages-rsc';
const POS_ROUTE_CACHE = 'pos-route-all';

const SHELL_PATHS = ['/offline-pos', '/offline', '/login'] as const;

function isSameOriginAppUrl(url: URL): boolean {
  return url.origin === self.location.origin;
}

function isNavigate(request: Request): boolean {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.destination === 'document')
  );
}

function isRscRequest(request: Request): boolean {
  return request.headers.get('RSC') === '1';
}

function isPosRelatedPath(pathname: string): boolean {
  if (SHELL_PATHS.includes(pathname as (typeof SHELL_PATHS)[number])) return true;
  if (pathname === '/') return true;
  return /^\/[^/]+\/(orders(\/new)?|waiter\/orders(\/new)?)(\/|$)/.test(pathname);
}

async function readCachedDocument(request: Request, url: URL): Promise<Response | undefined> {
  const pathnameKey = `${url.origin}${url.pathname}`;
  const cachesToTry = [HTML_CACHE, POS_ROUTE_CACHE];
  for (const cacheName of cachesToTry) {
    const cache = await caches.open(cacheName);
    const hit =
      (await cache.match(request, { ignoreSearch: true })) ??
      (await cache.match(pathnameKey, { ignoreSearch: true })) ??
      (await cache.match(request.url, { ignoreSearch: true }));
    if (hit) return hit;
  }
  return undefined;
}

async function readCachedRsc(request: Request, url: URL): Promise<Response | undefined> {
  const pathnameKey = `${url.origin}${url.pathname}`;
  const cachesToTry = [POS_ROUTE_CACHE, RSC_CACHE, HTML_CACHE];
  for (const cacheName of cachesToTry) {
    const cache = await caches.open(cacheName);
    const hit =
      (await cache.match(request)) ??
      (await cache.match(request, { ignoreSearch: true })) ??
      (await cache.match(pathnameKey, { ignoreSearch: true }));
    if (hit) return hit;
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

  const cached = await readCachedDocument(request, url);
  if (cached) return cached;

  try {
    const network = await fetch(request);
    if (network.ok || (network.status >= 300 && network.status < 400)) return network;
  } catch {
    /* continue to shells */
  }

  if (isPosRelatedPath(url.pathname)) {
    const posShell = (await precachedShell('/offline-pos')) ?? (await precachedShell('/offline'));
    if (posShell) return posShell;
  }

  if (url.pathname === '/login' || url.pathname === '/') {
    const login = await precachedShell('/login');
    if (login) return login;
  }

  const generic =
    (await precachedShell('/offline-pos')) ??
    (await precachedShell('/offline')) ??
    (await precachedShell('/login'));
  if (generic) return generic;

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
    return await fetch(request);
  } catch {
    const posRelated = isPosRelatedPath(url.pathname);
    if (posRelated) {
      const shellRsc = await readCachedRsc(
        new Request(`${url.origin}/offline-pos`, { headers: request.headers }),
        new URL(`${url.origin}/offline-pos`),
      );
      if (shellRsc) return shellRsc;
    }
    const shell = await readCachedRsc(
      new Request(`${url.origin}/offline-pos`, { headers: request.headers }),
      new URL(`${url.origin}/offline-pos`),
    );
    return shell ?? new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
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
    navigateFallback: '/offline-pos',
    navigateFallbackAllowlist: [
      /^\/$/,
      /^\/login\/?$/,
      /^\/offline\/?$/,
      /^\/offline-pos\/?$/,
      /^\/[^/]+\/orders\/?$/,
      /^\/[^/]+\/orders\/new\/?$/,
      /^\/[^/]+\/waiter\/orders\/?$/,
      /^\/[^/]+\/waiter\/orders\/new\/?$/,
    ],
    navigateFallbackDenylist: [/^\/api\//, /^\/_next\//],
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
    {
      matcher: ({ request, sameOrigin, url }: { request: Request; sameOrigin: boolean; url: URL }) =>
        sameOrigin && isNavigate(request) && isPosRelatedPath(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: HTML_CACHE,
        matchOptions: { ignoreSearch: true, ignoreVary: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 48,
            maxAgeSeconds: 14 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ request, sameOrigin, url }: { request: Request; sameOrigin: boolean; url: URL }) =>
        sameOrigin &&
        request.method === 'GET' &&
        isPosRelatedPath(url.pathname) &&
        !isNavigate(request),
      handler: new CacheFirst({
        cacheName: POS_ROUTE_CACHE,
        matchOptions: { ignoreSearch: true, ignoreVary: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 14 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ request, sameOrigin, url }: { request: Request; sameOrigin: boolean; url: URL }) =>
        sameOrigin && isRscRequest(request) && isPosRelatedPath(url.pathname),
      handler: new CacheFirst({
        cacheName: RSC_CACHE,
        matchOptions: { ignoreSearch: true, ignoreVary: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 96,
            maxAgeSeconds: 14 * 24 * 60 * 60,
          }),
        ],
      }),
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
      const html = await caches.open(HTML_CACHE);
      const pos = await caches.open(POS_ROUTE_CACHE);
      for (const path of SHELL_PATHS) {
        const shell = await serwist.matchPrecache(path);
        if (!shell) continue;
        const absolute = `${self.location.origin}${path}`;
        await html.put(absolute, shell.clone());
        await pos.put(absolute, shell.clone());
      }
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const fetchEvent = event as WorkerFetchEvent;
  const { request } = fetchEvent;
  const url = new URL(request.url);
  if (!isSameOriginAppUrl(url)) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;

  if (isNavigate(request)) {
    fetchEvent.respondWith(
      offlineNavigateResponse(request).catch(
        () =>
          new Response(
            '<!DOCTYPE html><html><body><p>Offline — reload once while online to enable caching.</p></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          ),
      ),
    );
    return;
  }

  if (isRscRequest(request)) {
    fetchEvent.respondWith(
      offlineRscResponse(request).catch(
        () => new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } }),
      ),
    );
    return;
  }
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

  if (data.type === 'SKIP_WAITING') {
    void (self as unknown as { skipWaiting: () => Promise<void> }).skipWaiting();
    return;
  }

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
        if (url.search) {
          const withoutSearch = `${url.origin}${url.pathname}`;
          await htmlCache.put(withoutSearch, response.clone());
          await posCache.put(withoutSearch, response.clone());
        }
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