'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/hooks/queries';
import { detectBusinessCurrencyFromIp } from '@/lib/geo/detect-currency';

const attemptedBusinessIds = new Set<string>();

/** Auto-detect and save tenant currency from ipinfo when not configured yet. */
export function useAutoDetectCurrency() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  const [detecting, setDetecting] = useState(false);
  const activeFor = useRef<string | null>(null);

  useEffect(() => {
    if (!business?.id || business.currency) {
      if (activeFor.current === business?.id) {
        activeFor.current = null;
        setDetecting(false);
      }
      return;
    }
    if (attemptedBusinessIds.has(business.id)) return;

    attemptedBusinessIds.add(business.id);
    activeFor.current = business.id;
    setDetecting(true);

    detectBusinessCurrencyFromIp()
      .then(() => queryClient.invalidateQueries({ queryKey: ['business', 'me'] }))
      .catch(() => {
        attemptedBusinessIds.delete(business.id);
      })
      .finally(() => {
        if (activeFor.current === business.id) {
          activeFor.current = null;
          setDetecting(false);
        }
      });
  }, [business?.id, business?.currency, queryClient]);

  return { detecting, hasCurrency: Boolean(business?.currency) };
}
