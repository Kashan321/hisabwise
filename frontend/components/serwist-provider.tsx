'use client';

import { useEffect } from 'react';
import { registerAppServiceWorker } from '@/lib/offline/register-service-worker';

export function SerwistProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerAppServiceWorker();
  }, []);

  return children;
}