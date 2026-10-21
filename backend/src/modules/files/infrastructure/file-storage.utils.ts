import { randomUUID } from 'crypto';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

export function sanitizeFolder(folder?: string): string {
  if (!folder?.trim()) return 'uploads';
  return folder
    .trim()
    .replace(/[^a-zA-Z0-9/_-]/g, '_')
    .replace(/^\/+|\/+$/g, '')
    .slice(0, 64);
}

export function extensionFor(mimeType: string, originalName: string): string {
  const fromMime = EXTENSION_BY_MIME[mimeType];
  if (fromMime) return fromMime;

  const fromName = originalName.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) {
    return fromName;
  }

  return 'bin';
}

export function buildObjectKey(
  businessId: string,
  mimeType: string,
  originalName: string,
  folder?: string,
): string {
  const safeFolder = sanitizeFolder(folder);
  const ext = extensionFor(mimeType, originalName);
  const safeName = sanitizeFilename(originalName.replace(/\.[^.]+$/, ''));
  return `${safeFolder}/${businessId}/${randomUUID()}-${safeName}.${ext}`;
}

export function encodeObjectKeyForUrl(key: string): string {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}
