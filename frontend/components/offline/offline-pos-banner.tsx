'use client';

import { Button, Icon } from '@/components/ui';
import { useOfflinePos } from '@/components/offline/offline-pos-provider';

export function OfflinePosBanner() {
  const offline = useOfflinePos();

  if (!offline.isOfflineMode && offline.pendingCount === 0) return null;

  return (
    <div
      className="border-b border-outline-variant bg-secondary-container px-4 py-2 text-on-secondary-container"
      role="status"
    >
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-3">
        <Icon name={offline.isOfflineMode ? 'wifi_off' : 'cloud_upload'} className="text-lg" />
        <div className="min-w-0 flex-1">
          <p className="font-body-emphasis">
            {offline.isOfflineMode ? 'Offline mode' : 'Back online'}
            {offline.pendingCount > 0
              ? ` · ${offline.pendingCount} order${offline.pendingCount === 1 ? '' : 's'} pending sync`
              : ''}
          </p>
          <p className="font-caption text-on-secondary-container/80">
            {offline.isOfflineMode
              ? 'Cash orders are saved on this device and will sync when the connection returns.'
              : 'Tap sync to upload pending offline orders.'}
          </p>
        </div>
        {offline.pendingCount > 0 && !offline.isOfflineMode ? (
          <Button variant="secondary" onClick={() => void offline.syncNow()}>
            Sync now
          </Button>
        ) : null}
      </div>
    </div>
  );
}
