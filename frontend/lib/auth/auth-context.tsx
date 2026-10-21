'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  apiFetch,
  clearTenantToken,
  getTenantToken,
  refreshTenantSession,
  setTenantToken,
} from '@/lib/api/client';
import {
  setLastBusinessSlug,
  TENANT_TOKEN_KEY,
} from '@/lib/api/auth-session';
import type { AuthUser } from '@/lib/api/types';
import { detectBusinessCurrencyFromIp } from '@/lib/geo/detect-currency';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  isReady: boolean;
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  register: (input: {
    businessName: string;
    businessSlug: string;
    phone: string;
    city: string;
    restaurantAddress: string;
    branchNumber: string;
    name: string;
    email: string;
    password: string;
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let authUser: AuthUser | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return authUser;
}

function setAuthUser(user: AuthUser | null) {
  authUser = user;
  listeners.forEach((l) => l());
}

async function loadTenantUser(): Promise<AuthUser | null> {
  if (!getTenantToken()) {
    const refreshed = await refreshTenantSession();
    if (refreshed?.user) return refreshed.user as AuthUser;
    if (!getTenantToken()) return null;
  }

  try {
    const data = await apiFetch<{ user: AuthUser }>('/auth/me');
    return data.user;
  } catch {
    const refreshed = await refreshTenantSession();
    if (refreshed?.user) return refreshed.user as AuthUser;
    if (refreshed?.accessToken) {
      try {
        const data = await apiFetch<{ user: AuthUser }>('/auth/me');
        return data.user;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const user = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const loadedUser = await loadTenantUser();
      if (cancelled) return;

      if (loadedUser) {
        setAuthUser(loadedUser);
        setLastBusinessSlug(loadedUser.businessSlug);
      } else if (getTenantToken()) {
        clearTenantToken();
        setAuthUser(null);
      } else {
        setAuthUser(null);
      }

      setIsReady(true);
    }

    void bootstrap();

    function onStorage(event: StorageEvent) {
      if (event.key !== TENANT_TOKEN_KEY) return;

      if (!event.newValue) {
        setAuthUser(null);
        return;
      }

      void loadTenantUser().then((loadedUser) => {
        if (cancelled) return;
        if (loadedUser) {
          setAuthUser(loadedUser);
          setLastBusinessSlug(loadedUser.businessSlug);
        }
      });
    }

    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const data = await apiFetch<{ user: AuthUser; accessToken: string }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify(input), auth: 'none' },
      );
      setTenantToken(data.accessToken);
      setAuthUser(data.user);
      setLastBusinessSlug(data.user.businessSlug);
      queryClient.clear();
      await detectBusinessCurrencyFromIp().catch(() => undefined);
      await queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
      return data.user;
    },
    [queryClient],
  );

  const register = useCallback(
    async (input: {
      businessName: string;
      businessSlug: string;
      name: string;
      email: string;
      password: string;
      primaryColor?: string;
      secondaryColor?: string;
      backgroundColor?: string;
      textColor?: string;
    }) => {
      const data = await apiFetch<{ user: AuthUser; accessToken: string }>(
        '/auth/register',
        { method: 'POST', body: JSON.stringify(input), auth: 'none' },
      );
      setTenantToken(data.accessToken);
      setAuthUser(data.user);
      setLastBusinessSlug(data.user.businessSlug);
      queryClient.clear();
      await detectBusinessCurrencyFromIp().catch(() => undefined);
      await queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST', auth: 'tenant' });
    } finally {
      clearTenantToken();
      setAuthUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isReady,
      login,
      register,
      logout,
      setUser: setAuthUser,
    }),
    [user, isReady, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Gate tenant API queries until session is restored and the user is authenticated. */
export function useTenantQueryEnabled() {
  const { isReady, isAuthenticated } = useAuth();
  return isReady && isAuthenticated;
}
