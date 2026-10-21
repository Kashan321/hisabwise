import { env } from '../../../../config/env';

export function isCosConfigured(): boolean {
  return Boolean(env.COS_SECRET_ID && env.COS_SECRET_KEY && env.COS_BUCKET);
}

export function getCosConfig() {
  if (!isCosConfigured()) {
    return null;
  }

  return {
    secretId: env.COS_SECRET_ID!,
    secretKey: env.COS_SECRET_KEY!,
    region: env.COS_REGION,
    bucket: env.COS_BUCKET!,
    publicBaseUrl: env.COS_PUBLIC_BASE_URL,
  };
}

export function buildPublicUrl(key: string): string {
  const config = getCosConfig();
  if (!config) {
    throw new Error('COS is not configured');
  }

  if (config.publicBaseUrl) {
    return `${config.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `https://${config.bucket}.cos.${config.region}.myqcloud.com/${encodedKey}`;
}
