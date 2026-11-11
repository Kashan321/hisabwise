'use client';

import { Drawer } from '@/components/ui/modal';
import { Button } from '@/components/ui';
import { useOfflinePos } from '@/components/offline/offline-pos-provider';

export function PendingSyncDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const offline = useOfflinePos();
  const rows = offline.pendingOrders.filter(
    (row) => row.syncStatus === 'pending' || row.syncStatus === 'error' || row.syncStatus === 'syncing',
  );

  return (
    <Drawer open={open} onClose={onClose} title="Pending offline orders">
      <div className="space-y-3 p-4">
        {!rows.length ? (
          <p className="font-body-base text-on-surface-variant">No queued offline orders.</p>
        ) : (
          rows.map((row) => (
            <article key={row.id} className="rounded-xl border border-outline-variant p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-body-emphasis">{row.offlineTicketLabel}</p>
                <span className="font-caption uppercase tracking-wide text-on-surface-variant">
                  {row.syncStatus}
                </span>
              </div>
              <p className="font-caption text-on-surface-variant">
                {new Date(row.createdAt).toLocaleString()}
              </p>
              {row.serverTicketLabel ? (
                <p className="font-caption text-primary">Synced as {row.serverTicketLabel}</p>
              ) : null}
              {row.syncError ? <p className="font-caption text-error">{row.syncError}</p> : null}
            </article>
          ))
        )}
        <Button className="w-full" disabled={offline.isOfflineMode} onClick={() => void offline.syncNow()}>
          Retry sync
        </Button>
      </div>
    </Drawer>
  );
}
