'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthScreen } from '@/components/auth/auth-screen';
import { Button, Input, PasswordInput, Spinner } from '@/components/ui';
import { formatApiError } from '@/lib/api/errors';
import { getTenantToken } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { getDefaultRoute } from '@/lib/auth/permissions';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isReady, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isReady && isAuthenticated && user?.businessSlug) {
      router.replace(getDefaultRoute(user, user.businessSlug));
    }
  }, [isReady, isAuthenticated, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login({ email: email.trim(), password });
      router.push(getDefaultRoute(loggedInUser, loggedInUser.businessSlug));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  if (!isReady && getTenantToken()) {
    return (
      <div className="h-dvh flex items-center justify-center bg-slate-950">
        <Spinner />
      </div>
    );
  }

  if (isReady && isAuthenticated) {
    return (
      <div className="h-dvh flex items-center justify-center bg-slate-950">
        <Spinner />
      </div>
    );
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to your restaurant workspace"
      footer={
        <p className="text-xs sm:text-sm text-on-surface-variant text-center">
          New here?{' '}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="!h-10 sm:!h-11"
        />
        <PasswordInput
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="!h-10 sm:!h-11"
        />
        {error && (
          <p className="text-xs sm:text-sm text-error bg-error-container/30 px-3 py-2 sm:px-4 sm:py-3 rounded-xl">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          className="w-full !h-10 sm:!h-12 rounded-xl"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthScreen>
  );
}
