import { apiFetch } from '@/lib/api/client';
import type { Business } from '@/lib/api/types';
import { currencyFromCountry } from '@/lib/currencies';

export type IpInfoResponse = {
  country?: string;
  city?: string;
  region?: string;
};

export async function fetchIpInfo(): Promise<IpInfoResponse | null> {
  try {
    const response = await fetch('https://ipinfo.io/json', { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as IpInfoResponse;
  } catch {
    return null;
  }
}

/** Suggested currency from the user's current country (client-side, no auth). */
export async function suggestCurrencyFromIp(): Promise<{
  country?: string;
  city?: string;
  currency: string;
} | null> {
  const info = await fetchIpInfo();
  if (!info?.country) return null;
  return {
    country: info.country,
    city: info.city,
    currency: currencyFromCountry(info.country),
  };
}

/** Persist detected currency on the business when not set yet. */
export async function detectBusinessCurrencyFromIp(): Promise<string | null> {
  const info = await fetchIpInfo();
  if (!info?.country) return null;

  const { business } = await apiFetch<{ business: Business }>('/business/detect-currency', {
    method: 'POST',
    body: JSON.stringify({ country: info.country }),
  });

  return business.currency ?? currencyFromCountry(info.country);
}
