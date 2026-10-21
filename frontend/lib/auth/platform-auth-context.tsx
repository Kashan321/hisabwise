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
  clearPlatformToken,
  getPlatformToken,
  refreshPlatformSession,
  setPlatformToken,
} from '@/lib/api/client';
import { PLATFORM_TOKEN_KEY } from '@/lib/api/auth-session';
import type { PlatformUser } from '@/lib/api/types';

interface PlatformAuthContextValue {
  user: PlatformUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null);

let platformUser: PlatformUser | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return platformUser;
}

function setPlatformUser(user: PlatformUser | null) {
  platformUser = user;
  listeners.forEach((l) => l());
}

async function loadPlatformUser(): Promise<PlatformUser | null> {
  if (!getPlatformToken()) {
    const refreshed = await refreshPlatformSession();
    if (refreshed?.user) return refreshed.user as PlatformUser;
    if (!getPlatformToken()) return null;
  }

  try {
    const data = await apiFetch<{ user: PlatformUser }>('/platform/auth/me', {
      auth: 'platform',
    });
    return data.user;
  } catch {
    const refreshed = await refreshPlatformSession();
    if (refreshed?.user) return refreshed.user as PlatformUser;
    if (refreshed?.accessToken) {
      try {
        const data = await apiFetch<{ user: PlatformUser }>('/platform/auth/me', {
          auth: 'platform',
        });
        return data.user;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function PlatformAuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const user = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const loadedUser = await loadPlatformUser();
      if (cancelled) return;

      if (loadedUser) {
        setPlatformUser(loadedUser);
      } else if (getPlatformToken()) {
        clearPlatformToken();
        setPlatformUser(null);
      } else {
        setPlatformUser(null);
      }

      setIsReady(true);
    }

    void bootstrap();

    function onStorage(event: StorageEvent) {
      if (event.key !== PLATFORM_TOKEN_KEY) return;

      if (!event.newValue) {
        setPlatformUser(null);
        return;
      }

      void loadPlatformUser().then((loadedUser) => {
        if (cancelled) return;
        if (loadedUser) setPlatformUser(loadedUser);
      });
    }

    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ user: PlatformUser; accessToken: string }>(
        '/platform/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }), auth: 'none' },
      );
      setPlatformToken(data.accessToken);
      setPlatformUser(data.user);
      queryClient.clear();
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/platform/auth/logout', { method: 'POST', auth: 'platform' });
    } finally {
      clearPlatformToken();
      setPlatformUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isReady,
      login,
      logout,
    }),
    [user, isReady, login, logout],
  );

  return (
    <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error('usePlatformAuth must be used within PlatformAuthProvider');
  return ctx;
}
