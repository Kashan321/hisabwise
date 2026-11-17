const TENANT_SEGMENTS =
  'orders|kitchen|menu|dashboard|tables|inventory|staff|reports|waiter|floor-plan|settings|terminal|display';

/** Tenant business routes that should use per-URL cached shells (not the New Order rewrite). */
export function isTenantShellPath(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/' || pathname === '/offline' || pathname === '/offline-status') {
    return true;
  }
  if (pathname.startsWith('/platform')) return false;
  return new RegExp(`^/[^/]+/(${TENANT_SEGMENTS})(/|$)`).test(pathname);
}

export function isNewOrderShellPath(pathname: string): boolean {
  return /^\/[^/]+\/(orders\/new|waiter\/orders\/new)\/?$/.test(pathname);
}

export function slugFromTenantPath(pathname: string): string | null {
  const match = pathname.match(/^\/([^/]+)\//);
  return match?.[1] ?? null;
}

/** Routes warmed for offline refresh and SW runtime caching (includes New Order shell). */
export function isOfflinePosRelatedPath(pathname: string): boolean {
  return (
    pathname === '/offline-pos' ||
    isNewOrderShellPath(pathname) ||
    isTenantShellPath(pathname)
  );
}