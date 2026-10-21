'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/config';
import { DEFAULT_BUSINESS_THEME, type ThemeColors } from '@/lib/theme/theme-css';

async function fetchBranding(): Promise<ThemeColors> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/branding`);
    if (!res.ok) return DEFAULT_BUSINESS_THEME;
    const json = (await res.json()) as {
      success: boolean;
      data?: { branding: ThemeColors };
    };
    if (!json.success || !json.data?.branding) return DEFAULT_BUSINESS_THEME;
    const b = json.data.branding;
    return {
      primaryColor: b.primaryColor ?? DEFAULT_BUSINESS_THEME.primaryColor,
      secondaryColor: b.secondaryColor ?? DEFAULT_BUSINESS_THEME.secondaryColor,
      backgroundColor: b.backgroundColor ?? DEFAULT_BUSINESS_THEME.backgroundColor,
      textColor: b.textColor ?? DEFAULT_BUSINESS_THEME.textColor,
    };
  } catch {
    return DEFAULT_BUSINESS_THEME;
  }
}

export function usePublicBranding() {
  const query = useQuery({
    queryKey: ['public', 'branding'],
    queryFn: fetchBranding,
    staleTime: 5 * 60 * 1000,
  });

  return {
    branding: query.data ?? DEFAULT_BUSINESS_THEME,
    ready: query.isSuccess || query.isError,
    isLoading: query.isLoading,
  };
}
