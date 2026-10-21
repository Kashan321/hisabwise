import { env } from '../../../config/env';

function decodePath(pathname: string): string {
  return decodeURIComponent(pathname.replace(/^\//, ''));
}

function publicBaseKey(url: string, baseUrl: string | undefined): string | null {
  if (!baseUrl) return null;
  const normalizedBase = baseUrl.replace(/\/$/, '');
  if (!url.startsWith(normalizedBase)) return null;
  const remainder = url.slice(normalizedBase.length).replace(/^\//, '');
  return decodeURIComponent(remainder.split('?')[0] ?? '');
}

/** Extract an object key from a stored URL, or return the value if it is already a key. */
export function extractStorageKey(reference: string): string | null {
  if (!reference.startsWith('http://') && !reference.startsWith('https://')) {
    return reference;
  }

  try {
    const parsed = new URL(reference);

    if (parsed.hostname.includes('r2.cloudflarestorage.com')) {
      return decodePath(parsed.pathname);
    }

    const fromR2Public = publicBaseKey(reference, env.R2_PUBLIC_BASE_URL);
    if (fromR2Public) return fromR2Public;

    const fromCosPublic = publicBaseKey(reference, env.COS_PUBLIC_BASE_URL);
    if (fromCosPublic) return fromCosPublic;

    return null;
  } catch {
    return null;
  }
}

/** Normalize any storage reference to a persisted object key (or keep external URLs). */
export function normalizeStorageKey(reference: string): string {
  const key = extractStorageKey(reference);
  return key ?? reference;
}

export function isManagedStorageReference(reference: string): boolean {
  if (!reference.startsWith('http://') && !reference.startsWith('https://')) {
    return true;
  }
  return extractStorageKey(reference) !== null;
}
