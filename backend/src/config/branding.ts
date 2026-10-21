/**
 * Central product branding for the backend.
 * Keep in sync with `frontend/lib/config.ts` when rebranding.
 */
export const BRANDING = {
  name: 'Hisab Wise',
  slug: 'hisabwise',
  domain: 'ventaretail.com',
  company: 'Hisab Wise',
  tagline: 'Restaurant operations, POS, and real-time reporting in one place',
  platformAdmin: 'Hisab Wise Admin',
  platform: 'Hisab Wise Platform',
  defaultDatabase: 'venta',
  defaultTestDatabase: 'venta-test',
  defaultBrandColor: '#62B4A7',
} as const;

export const APP_NAME = BRANDING.name;
export const APP_SLUG = BRANDING.slug;
export const APP_DOMAIN = BRANDING.domain;
export const APP_COMPANY = BRANDING.company;
export const APP_TAGLINE = BRANDING.tagline;
export const PLATFORM_ADMIN_NAME = BRANDING.platformAdmin;
export const PLATFORM_NAME = BRANDING.platform;

export function tenantUrl(slug: string): string {
  return `${BRANDING.domain}/${slug}`;
}

export function apiServiceName(): string {
  return `${BRANDING.name} API`;
}

export function apiRunningMessage(): string {
  return `${apiServiceName()} is running. Use /api/v1 for all endpoints.`;
}

export function postmanCollectionPath(): string {
  return `backend/postman/${BRANDING.slug}-api.postman_collection.json`;
}
