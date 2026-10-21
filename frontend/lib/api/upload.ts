import { API_BASE_URL } from '../config';
import type { ApiResponse } from './types';
import {
  ApiError,
  getPlatformToken,
  getTenantToken,
  refreshTenantSession,
  clearTenantToken,
} from './client';

export interface UploadedFile {
  key: string;
  url: string;
  mimeType: string;
  size: number;
  originalName: string;
}

export interface FileReadUrlResult {
  key: string;
  url: string;
}

export async function getFileReadUrl(
  key: string,
  options?: { auth?: 'tenant' | 'platform' },
): Promise<FileReadUrlResult> {
  const auth = options?.auth ?? 'tenant';
  const params = new URLSearchParams({ key });

  async function doFetch(retry: boolean): Promise<FileReadUrlResult> {
    const headers: HeadersInit = {};
    if (auth === 'tenant') {
      const token = getTenantToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } else if (auth === 'platform') {
      const token = getPlatformToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/files/read-url?${params.toString()}`, {
      headers,
      credentials: 'include',
    });

    const json = (await response.json()) as ApiResponse<FileReadUrlResult>;

    if (response.status === 401 && auth === 'tenant' && !retry) {
      const refreshed = await refreshTenantSession();
      if (refreshed?.accessToken) {
        return doFetch(true);
      }
      clearTenantToken();
    }

    if (!response.ok || !json.success || !json.data) {
      throw new ApiError(
        json.error?.code ?? 'UNKNOWN',
        json.error?.message ?? 'Failed to resolve file URL',
        response.status,
        json.error?.details,
      );
    }

    return json.data;
  }

  return doFetch(false);
}

export async function uploadFile(
  file: File,
  options?: { folder?: string; auth?: 'tenant' | 'platform' },
): Promise<UploadedFile> {
  const auth = options?.auth ?? 'tenant';
  const params = new URLSearchParams();
  if (options?.folder) params.set('folder', options.folder);
  const query = params.toString() ? `?${params.toString()}` : '';

  async function doUpload(retry: boolean): Promise<UploadedFile> {
    const headers: HeadersInit = {};
    if (auth === 'tenant') {
      const token = getTenantToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } else if (auth === 'platform') {
      const token = getPlatformToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const form = new FormData();
    form.append('file', file);

    const uploadPath =
      auth === 'platform'
        ? `${API_BASE_URL}/platform/menu-gallery/upload${query}`
        : `${API_BASE_URL}/files/upload${query}`;

    const response = await fetch(uploadPath, {
      method: 'POST',
      headers,
      body: form,
      credentials: 'include',
    });

    const json = (await response.json()) as ApiResponse<{ file: UploadedFile }>;

    if (response.status === 401 && auth === 'tenant' && !retry) {
      const refreshed = await refreshTenantSession();
      if (refreshed?.accessToken) {
        return doUpload(true);
      }
      clearTenantToken();
    }

    if (!response.ok || !json.success) {
      throw new ApiError(
        json.error?.code ?? 'UNKNOWN',
        json.error?.message ?? 'Upload failed',
        response.status,
        json.error?.details,
      );
    }

    return json.data.file;
  }

  return doUpload(false);
}
