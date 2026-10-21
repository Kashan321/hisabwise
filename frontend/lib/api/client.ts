import { API_BASE_URL } from '../config';
import type { ApiResponse } from './types';
import {
  clearPlatformToken,
  clearTenantToken,
  getPlatformToken,
  getTenantToken,
  isAuthRefreshPath,
  refreshPlatformSession,
  refreshTenantSession,
  setPlatformToken,
  setTenantToken,
} from './auth-session';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export {
  clearPlatformToken,
  clearTenantToken,
  getPlatformToken,
  getTenantToken,
  refreshPlatformSession,
  refreshTenantSession,
  setPlatformToken,
  setTenantToken,
};

type ApiFetchOptions = RequestInit & {
  auth?: 'tenant' | 'platform' | 'none';
  /** @internal prevents infinite refresh loops */
  _retry?: boolean;
};

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') ?? '';
  const raw = await res.text();

  if (!contentType.includes('application/json')) {
    const html = raw.trimStart().startsWith('<!');
    const express404 = /Cannot (GET|POST|PATCH|PUT|DELETE)/i.test(raw);
    let message: string;
    if (html && express404) {
      message =
        'This API build does not have that route (often the inbox module). Pull latest code, run prisma migrate deploy, rebuild, and restart venta-backend.';
    } else if (html) {
      message =
        'Server returned HTML instead of JSON — the request likely hit the Next.js site, not the API. Set NEXT_PUBLIC_API_URL to your API base (e.g. https://your-domain.com/api/v1 or http://localhost:4000/api/v1), or use NEXT_PUBLIC_API_URL=/api/v1 with the Next proxy (see frontend/.env.example).';
    } else {
      message = `Unexpected response (${res.status}): ${raw.slice(0, 120)}`;
    }
    throw new ApiError('INVALID_RESPONSE', message, res.status);
  }

  const json = JSON.parse(raw) as ApiResponse<T>;

  if (!res.ok || !json.success) {
    throw new ApiError(
      json.error?.code ?? 'UNKNOWN',
      json.error?.message ?? 'Request failed',
      res.status,
      json.error?.details,
    );
  }

  return json.data;
}

async function request<T>(
  path: string,
  options: ApiFetchOptions,
): Promise<{ data: T; response: Response }> {
  const { auth = 'tenant', _retry: _ignored, ...init } = options;
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth === 'tenant') {
    const token = getTenantToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  } else if (auth === 'platform') {
    const token = getPlatformToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  const data = await parseResponse<T>(response);
  return { data, response };
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const auth = options.auth ?? 'tenant';

  try {
    const { data } = await request<T>(path, options);
    return data;
  } catch (error) {
    const canRefresh =
      error instanceof ApiError &&
      error.status === 401 &&
      auth !== 'none' &&
      !options._retry &&
      !isAuthRefreshPath(path, auth);

    if (!canRefresh) throw error;

    const refreshed =
      auth === 'platform' ? await refreshPlatformSession() : await refreshTenantSession();

    if (!refreshed?.accessToken) {
      if (auth === 'tenant') clearTenantToken();
      if (auth === 'platform') clearPlatformToken();
      throw error;
    }

    const { data } = await request<T>(path, { ...options, _retry: true });
    return data;
  }
}
