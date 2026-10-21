import { env } from '../../../../config/env';

export function isR2Configured(): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME,
  );
}

export function getR2Config() {
  if (!isR2Configured()) {
    return null;
  }

  return {
    accountId: env.R2_ACCOUNT_ID!,
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    bucket: env.R2_BUCKET_NAME!,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL,
    endpoint: env.R2_ENDPOINT ?? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  };
}

export function buildR2PublicUrl(key: string): string {
  const config = getR2Config();
  if (!config) {
    throw new Error('R2 is not configured');
  }

  if (config.publicBaseUrl) {
    return `${config.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `https://${config.bucket}.${config.accountId}.r2.cloudflarestorage.com/${encodedKey}`;
}
