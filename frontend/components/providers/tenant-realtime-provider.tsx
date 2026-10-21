'use client';

import { useTenantQueryEnabled } from '@/lib/auth/auth-context';
import { useTenantRealtime } from '@/lib/hooks/use-tenant-realtime';

/** Keeps one tenant WebSocket alive for the whole authenticated session. */
export function TenantRealtimeProvider({ children }: { children: React.ReactNode }) {
  const tenantReady = useTenantQueryEnabled();
  useTenantRealtime(tenantReady);
  return <>{children}</>;
}
