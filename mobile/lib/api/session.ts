import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'hisabwise.accessToken';
const USER_JSON_KEY = 'hisabwise.authUser';

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function clearAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export async function getStoredUserJson(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(USER_JSON_KEY);
  } catch {
    return null;
  }
}

export async function setStoredUserJson(json: string): Promise<void> {
  await SecureStore.setItemAsync(USER_JSON_KEY, json);
}

export async function clearStoredUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_JSON_KEY);
}

export async function clearSession(): Promise<void> {
  await Promise.all([clearAccessToken(), clearStoredUser()]);
}