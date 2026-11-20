import Constants from 'expo-constants';

const defaultApiUrl = 'https://hisabwise.com/api/v1';

function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl?.trim();
  const raw = fromEnv || fromExtra || defaultApiUrl;
  return raw.replace(/\/$/, '');
}

export const API_BASE_URL = resolveApiUrl();