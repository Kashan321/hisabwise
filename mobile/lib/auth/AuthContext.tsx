import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { AuthUser, LoginResponse } from '@/lib/api/types';
import {
  clearSession,
  getAccessToken,
  getStoredUserJson,
  setAccessToken,
  setStoredUserJson,
} from '@/lib/api/session';

type AuthState = {
  user: AuthUser | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: (params: { email: string; password: string; businessSlug?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  const bootstrap = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const cached = await getStoredUserJson();
      if (cached) {
        try {
          setUser(JSON.parse(cached) as AuthUser);
        } catch {
          /* ignore */
        }
      }
      if (!token) {
        setUser(null);
        return;
      }
      const me = await apiFetch<AuthUser>('/auth/me');
      setUser(me);
      await setStoredUserJson(JSON.stringify(me));
    } catch {
      await clearSession();
      setUser(null);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (params: { email: string; password: string; businessSlug?: string }) => {
      const data = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        auth: 'none',
        body: JSON.stringify(params),
      });
      await setAccessToken(data.accessToken);
      await setStoredUserJson(JSON.stringify(data.user));
      setUser(data.user);
      queryClient.clear();
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* best effort */
    }
    await clearSession();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    const me = await apiFetch<AuthUser>('/auth/me');
    setUser(me);
    await setStoredUserJson(JSON.stringify(me));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isReady,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
    }),
    [user, isReady, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useTenantQueryEnabled(): boolean {
  const { isReady, isAuthenticated } = useAuth();
  return isReady && isAuthenticated;
}