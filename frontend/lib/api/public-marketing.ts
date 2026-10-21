import { API_BASE_URL } from '../config';
import type { PublicDemoConfig, PublicPricing } from './types';

async function fetchPublic<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data?: T };
    if (!json.success || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

export async function fetchPublicPricing(): Promise<PublicPricing | null> {
  const data = await fetchPublic<{ pricing: PublicPricing }>('/public/pricing');
  return data?.pricing ?? null;
}

export async function fetchPublicDemoConfig(): Promise<PublicDemoConfig | null> {
  const data = await fetchPublic<{ demo: PublicDemoConfig }>('/public/demo');
  return data?.demo ?? null;
}

export async function submitDemoRequest(body: {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  scheduledAt?: string | null;
  eventName?: string | null;
  calendlyInviteeUri?: string | null;
  source?: 'CALENDLY' | 'MANUAL';
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/demo-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}
