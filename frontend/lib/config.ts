/**
 * Central product branding for the frontend.
 * Keep in sync with `backend/src/config/branding.ts` when rebranding.
 */
export const BRANDING = {
  name: 'Hisab Wise',
  slug: 'hisabwise',
  domain: 'ventaretail.com',
  company: 'Hisab Wise',
  tagline: 'Restaurant operations, POS, and real-time reporting in one place',
  platformAdmin: 'Hisab Wise Admin',
  platform: 'Hisab Wise Platform',
  defaultBrandColor: '#62B4A7',
} as const;

export const APP_NAME = BRANDING.name;
export const APP_SLUG = BRANDING.slug;
export const APP_DOMAIN = BRANDING.domain;
export const APP_COMPANY = BRANDING.company;
export const APP_TAGLINE = BRANDING.tagline;
export const PLATFORM_ADMIN_NAME = BRANDING.platformAdmin;
export const PLATFORM_NAME = BRANDING.platform;
export const STORAGE_KEY_PREFIX = BRANDING.slug;

/** Trailing slashes are stripped so paths like `/notifications/inbox` join correctly. */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:4000/api/v1'
).replace(/\/$/, '');

export function tenantUrl(slug: string): string {
  return `${BRANDING.domain}/${slug}`;
}

/** WebSocket URL for tenant realtime events (derived from API URL unless overridden). */
export function getTenantWsUrl(token: string): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) {
    const base = explicit.replace(/\/ws\/(kitchen|tenant)\/?$/, '');
    const url = new URL(`${base.replace(/\/$/, '')}/ws/tenant`);
    url.searchParams.set('token', token);
    return url.toString();
  }

  const api = new URL(API_BASE_URL);
  api.protocol = api.protocol === 'https:' ? 'wss:' : 'ws:';
  api.pathname = '/ws/tenant';
  api.search = '';
  api.searchParams.set('token', token);
  return api.toString();
}

/** @deprecated Use getTenantWsUrl */
export const getKitchenWsUrl = getTenantWsUrl;
