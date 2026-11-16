/** Tenant routes that should survive offline hard refresh via the offline POS shell. */
export function isOfflinePosRelatedPath(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/' || pathname === '/offline' || pathname === '/offline-pos') {
    return true;
  }
  return /^\/[^/]+\/(orders(\/new)?|waiter\/orders(\/new)?)(\/|$)/.test(pathname);
}

export function slugFromTenantPath(pathname: string): string | null {
  const match = pathname.match(/^\/([^/]+)\//);
  return match?.[1] ?? null;
}