import { API_BASE_URL } from '@/lib/config';
import type { ApiResponse } from '@/lib/api/types';
import { getAccessToken, setAccessToken } from '@/lib/api/session';

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

type ApiFetchOptions = RequestInit & {
  auth?: 'tenant' | 'none';
  /** @internal prevents infinite refresh loops */
  _retry?: boolean;
};

const REFRESH_PATHS = new Set(['/auth/refresh', '/auth/login', '/auth/logout', '/auth/register']);

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') ?? '';
  const raw = await res.text();

  if (!contentType.includes('application/json')) {
    throw new ApiError(
      'INVALID_RESPONSE',
      `Unexpected response (${res.status}): ${raw.slice(0, 120)}`,
      res.status,
    );
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

async function tryRefreshSession(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const json = (await res.json()) as ApiResponse<{ accessToken: string }>;
    if (!json.success || !json.data?.accessToken) return false;
    await setAccessToken(json.data.accessToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: ApiFetchOptions): Promise<T> {
  const { auth = 'tenant', _retry, ...init } = options;
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (auth === 'tenant') {
    const token = await getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (
    response.status === 401 &&
    auth === 'tenant' &&
    !_retry &&
    !REFRESH_PATHS.has(path)
  ) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return request<T>(path, { ...options, _retry: true });
    }
  }

  return parseResponse<T>(response);
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  return request<T>(path, options);
}