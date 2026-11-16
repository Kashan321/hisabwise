const POS_FETCH_CACHE = 'pos-route-explicit';
const RSC_CACHE = 'pages-rsc';
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

function headerRecord(init?: RequestInit): Record<string, string> {
  if (!init?.headers) return {};
  if (init.headers instanceof Headers) {
    return Object.fromEntries(init.headers.entries());
  }
  return init.headers as Record<string, string>;
}

function isRscRequest(url: string, init?: RequestInit) {
  const headers = headerRecord(init);
  if (headers.RSC === '1') return true;
  return url.includes('_rsc=');
}

async function readFromOfflineCaches(url: string) {
  const parsed = new URL(url);
  const pathnameKey = `${parsed.origin}${parsed.pathname}`;
  for (const cacheName of [POS_FETCH_CACHE, RSC_CACHE, 'pages', 'pos-route-all']) {
    const cache = await caches.open(cacheName);
    const hit =
      (await cache.match(url)) ?? (await cache.match(pathnameKey, { ignoreSearch: true }));
    if (hit) return hit;
  }
  return null;
}

async function persistOnlineResponse(url: string, response: Response, init?: RequestInit) {
  if (!response.ok || response.redirected || !navigator.onLine) return;
  const parsed = new URL(url);
  if (parsed.pathname.startsWith('/api/')) return;

  const cachesToWrite: string[] = [];
  if (parsed.pathname.includes('/orders/new') || url.includes('_rsc')) {
    cachesToWrite.push(POS_FETCH_CACHE, RSC_CACHE);
  } else if (isRscRequest(url, init)) {
    cachesToWrite.push(RSC_CACHE);
  } else {
    return;
  }

  const body = await response.clone().blob();
  const pathnameKey = `${parsed.origin}${parsed.pathname}`;
  for (const cacheName of cachesToWrite) {
    const cache = await caches.open(cacheName);
    for (const key of [url, pathnameKey]) {
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
}

export function installPosRouteFetchCache() {
  if (typeof window === 'undefined' || installed || !('fetch' in window) || !('caches' in window)) {
    return;
  }
  installed = true;
  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = resolveRequestUrl(input, init);
  try {
      const response = await original(input, init);
      if (url) await persistOnlineResponse(url, response, init);
      return response;
    } catch (err) {
      if (!navigator.onLine && url) {
        const hit = await readFromOfflineCaches(url);
        if (hit) return hit;
      }
      throw err;
    }
  };
}