'use client';

import { Button, Icon } from '@/components/ui';
import { formatApiError } from '@/lib/api/errors';
import {
  browserNotificationsSupported,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from '@/lib/browser-notifications';
import { useNotificationPreferences } from '@/lib/hooks/queries';
import { useUpdateNotificationPreferences } from '@/lib/hooks/mutations';
import { useToast } from '@/lib/toast';

export function NotificationPreferencesPanel() {
  const toast = useToast();
  const { data: preferences, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const permission = getBrowserNotificationPermission();
  const supported = browserNotificationsSupported();

  async function enableBrowser() {
    const result = await requestBrowserNotificationPermission();
    if (result === 'granted') {
      try {
        await update.mutateAsync({ browserEnabled: true });
        toast.success('Browser notifications enabled');
      } catch (err) {
        toast.error(formatApiError(err));
      }
    } else if (result === 'denied') {
      toast.error('Notifications blocked in browser settings');
    }
  }

  if (isLoading || !preferences) {
    return <p className="text-sm text-on-surface-variant">Loading preferences…</p>;
  }

  return (
    <section className="rounded-xl border border-outline-variant/25 bg-surface p-4 md:p-5 space-y-4">
      <div>
        <h2 className="font-title-lg text-primary flex items-center gap-2">
          <Icon name="tune" />
          Browser notifications
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Show desktop alerts for new inbox messages when this app is open or in the background.
        </p>
      </div>

      {!supported && (
        <p className="text-sm text-on-surface-variant">Your browser does not support notifications.</p>
      )}

      {supported && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-on-surface-variant">
            Permission: <span className="font-medium text-on-surface capitalize">{permission}</span>
          </p>
          {permission !== 'granted' && (
            <Button type="button" variant="primary" onClick={enableBrowser} loading={update.isPending}>
              Enable in browser
            </Button>
          )}
          {permission === 'granted' && (
            <Button
              type="button"
              variant={preferences.browserEnabled ? 'outline' : 'primary'}
              loading={update.isPending}
              onClick={async () => {
                try {
                  await update.mutateAsync({ browserEnabled: !preferences.browserEnabled });
                } catch (err) {
                  toast.error(formatApiError(err));
                }
              }}
            >
              {preferences.browserEnabled ? 'Turn off alerts' : 'Turn on alerts'}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
