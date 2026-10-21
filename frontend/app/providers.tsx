'use client';

import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/lib/auth/auth-context';
import { PlatformAuthProvider } from '@/lib/auth/platform-auth-context';
import { TenantRealtimeProvider } from '@/components/providers/tenant-realtime-provider';
import { ToastProvider } from '@/lib/toast';
import { REFERENCE_GC_MS } from '@/lib/query-cache';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: REFERENCE_GC_MS,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            placeholderData: keepPreviousData,
          },
          mutations: {
            networkMode: 'always',
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantRealtimeProvider>
          <PlatformAuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </PlatformAuthProvider>
        </TenantRealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
