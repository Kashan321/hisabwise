'use client';

import { useEffect, useState } from 'react';
import { Icon, IconButton, Spinner } from '@/components/ui';
import { getFileReadUrl } from '@/lib/api/upload';
import type { PlatformTenantAlert } from '@/lib/api/types';
import { useDismissTenantAlert } from '@/lib/hooks/mutations';
import { useActiveTenantAlert } from '@/lib/hooks/queries';

function AlertImage({ imageUrl }: { imageUrl: string }) {
  const [src, setSrc] = useState<string | null>(
    imageUrl.startsWith('http://') || imageUrl.startsWith('https://') ? imageUrl : null,
  );

  useEffect(() => {
    if (src) return;
    let cancelled = false;
    getFileReadUrl(imageUrl)
      .then((r) => {
        if (!cancelled) setSrc(r.url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [imageUrl, src]);

  if (!src) return null;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-outline-variant/15 mb-4 max-h-48">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="w-full h-full object-cover max-h-48" />
    </div>
  );
}

function PromoAlertCard({
  alert,
  onDismiss,
  dismissing,
}: {
  alert: PlatformTenantAlert;
  onDismiss: () => void;
  dismissing: boolean;
}) {
  const linkLabel = alert.linkLabel?.trim() || 'Learn more';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tenant-promo-alert-title"
      className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 p-5 sm:p-6"
    >
      <IconButton
        type="button"
        title="Dismiss for today"
        aria-label="Dismiss for today"
        className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface"
        disabled={dismissing}
        onClick={onDismiss}
      >
        <Icon name="close" />
      </IconButton>

      {alert.imageUrl && <AlertImage imageUrl={alert.imageUrl} />}

      <p id="tenant-promo-alert-title" className="font-body-emphasis text-primary text-lg pr-10">
        Announcement
      </p>
      <p className="mt-3 text-sm text-on-surface whitespace-pre-wrap leading-relaxed">
        {alert.bodyText}
      </p>

      {alert.linkUrl && (
        <a
          href={alert.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:underline"
        >
          {linkLabel}
          <Icon name="open_in_new" className="text-base" />
        </a>
      )}

      {dismissing && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/60 rounded-2xl">
          <Spinner />
        </div>
      )}
    </div>
  );
}

export function TenantPromoAlertOverlay({ enabled = true }: { enabled?: boolean }) {
  const { data: alert, isLoading } = useActiveTenantAlert({ enabled });
  const dismiss = useDismissTenantAlert();

  if (!enabled || isLoading || !alert) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]">
      <PromoAlertCard
        alert={alert}
        dismissing={dismiss.isPending}
        onDismiss={() => dismiss.mutate(alert.id)}
      />
    </div>
  );
}
