/** Classify and validate Next.js App Router HTML vs RSC flight responses. */

export const RSC_CONTENT_TYPE = 'text/x-component';

export function headerMap(init?: RequestInit | Headers): Record<string, string> {
  if (!init) return {};
  if (init instanceof Headers) return Object.fromEntries(init.entries());
  if (typeof init === 'object' && 'headers' in init && init.headers) {
    if (init.headers instanceof Headers) return Object.fromEntries(init.headers.entries());
    return init.headers as Record<string, string>;
  }
  return {};
}

export function isRscFetch(url: string, headers: Record<string, string>): boolean {
  if (headers.RSC === '1') return true;
  if (headers['Next-Router-State-Tree']) return true;
  if (headers['Next-Router-Prefetch'] === '1') return true;
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : undefined);
    if (parsed.searchParams.has('_rsc')) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function isHtmlDocumentRequest(
  request: Pick<Request, 'url' | 'mode' | 'method' | 'destination' | 'headers'>,
): boolean {
  if (request.method !== 'GET') return false;
  const isNav =
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    (request.headers.get('Accept')?.includes('text/html') ?? false);
  return isNav && !isRscFetchFromRequest(request);
}

export function isRscFetchFromRequest(request: Pick<Request, 'url' | 'headers'>): boolean {
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => {
    headers[k] = v;
  });
  return isRscFetch(request.url, headers);
}

export function isRscContentType(contentType: string | null | undefined): boolean {
  const ct = (contentType ?? '').toLowerCase();
  return ct.includes(RSC_CONTENT_TYPE);
}

export function isHtmlContentType(contentType: string | null | undefined): boolean {
  const ct = (contentType ?? '').toLowerCase();
  return ct.includes('text/html');
}

export function isValidCachedHtml(response: Response): boolean {
  return isHtmlContentType(response.headers.get('content-type'));
}

export function isValidCachedRsc(response: Response): boolean {
  const ct = response.headers.get('content-type') ?? '';
  return isRscContentType(ct) || ct.includes('text/plain');
}

export function documentCacheKey(url: URL): string {
  return `${url.origin}${url.pathname}`;
}

export function rscCacheKey(url: string, headers?: Record<string, string>): string {
  const parsed = new URL(url);
  const tree = headers?.['Next-Router-State-Tree'] ?? '';
  const prefetch = headers?.['Next-Router-Prefetch'] ?? '';
  return `${parsed.origin}${parsed.pathname}${parsed.search}|rsc=1|tree=${tree}|prefetch=${prefetch}`;
}

export function bodyLooksLikeRscFlight(text: string): boolean {
  const t = text.trimStart();
  return /^[0-9]+:\{/.test(t) || t.startsWith('0:["') || t.startsWith('1:');
}