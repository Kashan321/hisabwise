'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { offlineScopeKey } from '@/lib/offline/db';
import {
  isReadyForOffline,
  probeSwReadiness,
  type SwReadinessSnapshot,
} from '@/lib/offline/sw-readiness';

export default function OfflineStatusPage() {
  const { user } = useAuth();
  const scopeKey =
    user?.businessId && user?.id ? offlineScopeKey(user.businessId, user.id) : null;
  const [snap, setSnap] = useState<SwReadinessSnapshot | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const next = await probeSwReadiness(scopeKey);
    setSnap(next);
    setReady(isReadyForOffline(next, { requireSnapshot: !!scopeKey }));
  }, [scopeKey]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 4000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 font-body">
      <h1 className="font-headline-medium">Offline readiness</h1>
      <p className="text-on-surface-variant">
        Use this page after{' '}
        <code className="rounded bg-surface-container px-1">npm run build &amp;&amp; npm run start</code>{' '}
        (not <code className="rounded bg-surface-container px-1">npm run dev</code>). Open the POS
        once while online on the same host you will use offline (
        <code className="rounded bg-surface-container px-1">localhost</code> and{' '}
        <code className="rounded bg-surface-container px-1">127.0.0.1</code> are separate).
      </p>

      <div
        className={`rounded-lg border px-4 py-3 ${
          ready
            ? 'border-primary bg-primary-container text-on-primary-container'
            : 'border-outline-variant bg-surface-container-low'
        }`}
        role="status"
      >
        <p className="font-body-emphasis">
          {ready ? 'Ready for offline' : 'Not ready for offline yet'}
        </p>
        <p className="font-caption opacity-90">
          {ready
            ? 'Service worker controls this tab and shell/data caches look good.'
            : 'Keep this tab online, visit POS, wait for snapshot sync, then check again.'}
        </p>
      </div>

      {snap ? (
        <dl className="space-y-2 rounded-lg border border-outline-variant p-4 font-caption">
          <div className="flex justify-between gap-4">
            <dt>SW controls page</dt>
            <dd>{snap.controllerPresent ? 'yes' : 'no'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Scope</dt>
            <dd className="truncate text-right">{snap.registrationScope ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Active worker</dt>
            <dd className="truncate text-right">{snap.activeScriptUrl ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Waiting worker</dt>
            <dd className="truncate text-right">{snap.waitingScriptUrl ?? 'none'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Installing</dt>
            <dd>{snap.installingState ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>IndexedDB snapshot</dt>
            <dd>{snap.indexedDbSnapshotPresent ? 'present' : scopeKey ? 'missing' : 'login required'}</dd>
          </div>
          <div>
            <dt className="mb-1">Shell caches</dt>
            <dd>
              <pre className="overflow-x-auto rounded bg-surface-container p-2 text-xs">
                {JSON.stringify(
                  { caches: snap.cacheKeys, counts: snap.shellCacheCounts, shells: snap.precacheShellHits },
                  null,
                  2,
                )}
              </pre>
            </dd>
          </div>
        </dl>
      ) : (
        <p>Loading…</p>
      )}

      <ul className="list-disc space-y-1 pl-5 font-caption text-on-surface-variant">
        <li>
          In Chrome DevTools → Application → Service workers, turn off{' '}
          <strong>Update on reload</strong> and <strong>Bypass for network</strong> when testing
          offline refresh.
        </li>
        <li>Network panel “Offline” is supported; the page must show “SW controls page: yes” first.</li>
      </ul>

      <button
        type="button"
        className="rounded-md bg-primary px-4 py-2 text-on-primary"
        onClick={() => void refresh()}
      >
        Refresh status
      </button>

      <p>
        <Link href="/" className="text-primary underline">
          Home
        </Link>
      </p>
    </main>
  );
}