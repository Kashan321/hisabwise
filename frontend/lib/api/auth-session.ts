import { API_BASE_URL } from '../config';
import type { ApiResponse } from './types';

const TENANT_TOKEN_KEY = 'accessToken';
const PLATFORM_TOKEN_KEY = 'platformAccessToken';
export const LAST_BUSINESS_SLUG_KEY = 'lastBusinessSlug';

export { TENANT_TOKEN_KEY, PLATFORM_TOKEN_KEY };

function migrateTokenStorage(key: string) {
  if (typeof window === 'undefined') return;
  const legacy = sessionStorage.getItem(key);
  if (legacy && !localStorage.getItem(key)) {
    localStorage.setItem(key, legacy);
    sessionStorage.removeItem(key);
  }
}

export function getTenantToken(): string | null {
  if (typeof window === 'undefined') return null;
  migrateTokenStorage(TENANT_TOKEN_KEY);
  return localStorage.getItem(TENANT_TOKEN_KEY);
}

export function setTenantToken(token: string) {
  localStorage.setItem(TENANT_TOKEN_KEY, token);
  sessionStorage.removeItem(TENANT_TOKEN_KEY);
}

export function clearTenantToken() {
  localStorage.removeItem(TENANT_TOKEN_KEY);
  sessionStorage.removeItem(TENANT_TOKEN_KEY);
}

export function getPlatformToken(): string | null {
  if (typeof window === 'undefined') return null;
  migrateTokenStorage(PLATFORM_TOKEN_KEY);
  return localStorage.getItem(PLATFORM_TOKEN_KEY);
}

export function setPlatformToken(token: string) {
  localStorage.setItem(PLATFORM_TOKEN_KEY, token);
  sessionStorage.removeItem(PLATFORM_TOKEN_KEY);
}

export function clearPlatformToken() {
  localStorage.removeItem(PLATFORM_TOKEN_KEY);
  sessionStorage.removeItem(PLATFORM_TOKEN_KEY);
}

export type TenantSessionPayload = {
  accessToken: string;
  user?: {
    id: string;
    name: string;
    email: string;
    businessId: string;
    businessSlug: string;
    roles: string[];
    permissions: string[];
  };
};

export type PlatformSessionPayload = {
  accessToken: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN';
    permissions: string[];
  };
};

export function setLastBusinessSlug(slug: string) {
  localStorage.setItem(LAST_BUSINESS_SLUG_KEY, slug);
}

export function getLastBusinessSlug(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_BUSINESS_SLUG_KEY);
}

async function postRefresh<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? 'Refresh failed');
  }

  return json.data;
}

let tenantRefreshInFlight: Promise<TenantSessionPayload | null> | null = null;
let platformRefreshInFlight: Promise<PlatformSessionPayload | null> | null = null;

/** Exchange the httpOnly refresh cookie for a new tenant session. */
export async function refreshTenantSession(): Promise<TenantSessionPayload | null> {
  if (tenantRefreshInFlight) return tenantRefreshInFlight;

  tenantRefreshInFlight = (async () => {
    try {
      const data = await postRefresh<TenantSessionPayload>('/auth/refresh');
      setTenantToken(data.accessToken);
      if (data.user?.businessSlug) {
        setLastBusinessSlug(data.user.businessSlug);
      }
      return data;
    } catch {
      return null;
    } finally {
      tenantRefreshInFlight = null;
    }
  })();

  return tenantRefreshInFlight;
}

/** Exchange the httpOnly refresh cookie for a new platform admin session. */
export async function refreshPlatformSession(): Promise<PlatformSessionPayload | null> {
  if (platformRefreshInFlight) return platformRefreshInFlight;

  platformRefreshInFlight = (async () => {
    try {
      const data = await postRefresh<PlatformSessionPayload>('/platform/auth/refresh');
      setPlatformToken(data.accessToken);
      return data;
    } catch {
      return null;
    } finally {
      platformRefreshInFlight = null;
    }
  })();

  return platformRefreshInFlight;
}

export function isAuthRefreshPath(path: string, auth: 'tenant' | 'platform' | 'none'): boolean {
  if (auth === 'tenant') {
    return (
      path === '/auth/refresh' ||
      path === '/auth/login' ||
      path === '/auth/register' ||
      path === '/auth/logout'
    );
  }
  if (auth === 'platform') {
    return (
      path === '/platform/auth/refresh' ||
      path === '/platform/auth/login' ||
      path === '/platform/auth/logout'
    );
  }
  return true;
}
