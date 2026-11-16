import { env } from './env';

export function getCorsOrigins(): string[] {
  const origins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (env.NODE_ENV !== 'production') {
    for (const origin of [...origins]) {
      if (origin.includes('localhost')) {
        origins.push(origin.replace('localhost', '127.0.0.1'));
      }
      if (origin.includes('127.0.0.1')) {
        origins.push(origin.replace('127.0.0.1', 'localhost'));
      }
    }
  }

  return [...new Set(origins)];
}
