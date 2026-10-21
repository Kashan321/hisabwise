'use client';

import { useCallback } from 'react';
import { useBusiness } from '@/lib/hooks/queries';
import { formatCurrency } from '@/lib/format-currency';
import { DEFAULT_CURRENCY } from '@/lib/currencies';

export function useBusinessCurrency(fallback?: string) {
  const { data: business } = useBusiness();
  return business?.currency ?? fallback ?? DEFAULT_CURRENCY;
}

export function useFormatMoney(fallback?: string) {
  const currency = useBusinessCurrency(fallback);
  return useCallback(
    (amount: number | string | null | undefined) => formatCurrency(amount, currency),
    [currency],
  );
}
