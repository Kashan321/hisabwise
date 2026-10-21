'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getPlatformToken } from '@/lib/api/client';
import { usePlatformAuth } from '@/lib/auth/platform-auth-context';
import { PLATFORM_NAME } from '@/lib/config';
import { Button, Icon, Input, PasswordInput, Spinner } from '@/components/ui';

export default function PlatformLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isReady } = usePlatformAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace('/platform');
    }
  }, [isReady, isAuthenticated, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/platform');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  if (!isReady && getPlatformToken()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-low">
        <Spinner />
      </div>
    );
  }

  if (isReady && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-low">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-low px-margin-mobile">
      <div className="w-full max-w-md bg-surface-container-lowest p-8 rounded-xl card-hairline">
        <div className="flex items-center gap-2 mb-8">
          <Icon name="admin_panel_settings" className="text-secondary text-3xl" />
          <span className="font-display-md text-secondary">{PLATFORM_NAME}</span>
        </div>
        <h2 className="font-display-md mb-2">Platform login</h2>
        <p className="font-body-base text-on-surface-variant mb-6">
          Super admin and platform admin access.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <p className="font-caption text-error">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
