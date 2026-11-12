import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, NetworkFirst, NetworkOnly, Serwist } from 'serwist';

const HTML_CACHE = 'pages';
const RSC_CACHE = 'pages-rsc';

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
        url.pathname.includes('/orders/new') &&
        request.headers.get('RSC') === '1',
      handler: new CacheFirst({
        cacheName: RSC_CACHE,
        matchOptions: { ignoreSearch: true },
      }),
    },
    {
      matcher: ({ request, sameOrigin, url }: { request: Request; sameOrigin: boolean; url: URL }) =>
        sameOrigin && url.pathname.includes('/orders/new') && request.mode === 'navigate',
      handler: new CacheFirst({
        cacheName: HTML_CACHE,
        matchOptions: { ignoreSearch: true },
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline-pos',
        matcher({ request }: { request: Request }) {
          return request.mode === 'navigate';
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener('message', (event) => {
  const data = event.data as { type?: string; url?: string } | null;
  const url = data?.type === 'CACHE_POS_URL' ? data.url : undefined;
  if (!url) return;

  void (async () => {
    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (!response.ok || response.redirected) return;
      const cache = await caches.open(HTML_CACHE);
      await cache.put(url, response);
    } catch {
      /* ignore */
    }
  })();
});
