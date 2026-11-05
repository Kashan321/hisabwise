import { APP_DOMAIN, APP_SLUG } from './branding';
import { env } from './env';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function isLocalhostUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return true;
  }
}

function corsOrigins(): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function pickPublicOrigin(origins: string[]): string | null {
  const remote = origins.filter((origin) => !isLocalhostUrl(origin));
  if (!remote.length) return null;

  const httpsPreferred = (match: (hostname: string) => boolean) =>
    remote.find((origin) => {
      try {
        const parsed = new URL(origin);
        return parsed.protocol === 'https:' && match(parsed.hostname);
      } catch {
        return false;
      }
    });

  return (
    httpsPreferred((hostname) => hostname.includes(APP_SLUG)) ??
    httpsPreferred((hostname) => hostname.includes(APP_DOMAIN.split('.')[0] ?? '')) ??
    remote.find((origin) => origin.startsWith('https://')) ??
    remote[0] ??
    null
  );
}

/** Frontend base URL for emails, QR codes, and other customer-facing links. */
export function getPublicAppUrl(): string {
  const configured = trimTrailingSlash(env.APP_URL);
  if (!isLocalhostUrl(configured)) {
    return configured;
  }

  const fromCors = pickPublicOrigin(corsOrigins());
  if (fromCors) {
    return trimTrailingSlash(fromCors);
  }

  if (env.NODE_ENV === 'production') {
    return `https://${APP_DOMAIN}`;
  }

  return configured;
}

export function buildTenantPath(slug: string, path: string): string {
  const base = getPublicAppUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}/${slug}${normalizedPath}`.replace(/([^:]\/)\/+/g, '$1');
}
