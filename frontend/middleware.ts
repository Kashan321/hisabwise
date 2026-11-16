import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Serve the offline-capable POS shell for New Order while keeping the public URL
 * `/{slug}/orders/new`. The shell reads tenant state from IndexedDB when offline.
 */
export function middleware(request: NextRequest) {
  const newOrder = request.nextUrl.pathname.match(/^\/([^/]+)\/orders\/new\/?$/);
  const waiterNew = request.nextUrl.pathname.match(/^\/([^/]+)\/waiter\/orders\/new\/?$/);
  const match = newOrder ?? waiterNew;
  if (!match) return NextResponse.next();

  const slug = match[1];
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = '/offline-pos';
  rewriteUrl.searchParams.set('slug', slug);
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ['/:slug/orders/new', '/:slug/waiter/orders/new'],
};