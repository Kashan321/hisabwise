'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { BusinessDayPowerButton } from '@/components/business-day/business-day-controls';
import { Button, Icon } from '@/components/ui';
import { useCurrentBusinessDay } from '@/lib/hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/toast';

function formatBusinessDateLabel(businessDate: string): string {
  return new Date(`${businessDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function BusinessDayLifecycleMonitor() {
  const toast = useToast();
  const qc = useQueryClient();
  const lastAutoCloseId = useRef<string | null>(null);
  const { data } = useCurrentBusinessDay();

  useEffect(() => {
    const autoClosed = data?.lifecycle?.autoClosed;
    if (!autoClosed) return;
    if (lastAutoCloseId.current === autoClosed.businessDayId) return;
    lastAutoCloseId.current = autoClosed.businessDayId;
    toast.success(
      `Business day ${formatBusinessDateLabel(autoClosed.businessDate)} was closed automatically at the new business day start. Open today's day to continue.`,
    );
    qc.invalidateQueries({ queryKey: ['business-days'] });
  }, [data?.lifecycle?.autoClosed, toast, qc]);

  return null;
}

export function BusinessDayNoticeBanner({ slug }: { slug: string }) {
  const { data } = useCurrentBusinessDay();
  const reminder = data?.lifecycle?.reminder;

  if (!reminder) return null;

  const isShiftBlock = reminder.code === 'OPEN_SHIFTS_BLOCKING_CLOSE';

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        isShiftBlock
          ? 'border-amber-300 bg-amber-50'
          : 'border-violet-300 bg-violet-50'
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            isShiftBlock ? 'bg-amber-100' : 'bg-violet-100'
          }`}
        >
          <Icon
            name={isShiftBlock ? 'warning' : 'event_busy'}
            className={`text-xl ${isShiftBlock ? 'text-amber-800' : 'text-violet-800'}`}
          />
        </div>
        <div className="min-w-0">
          <p className="font-body-emphasis text-on-surface">
            {isShiftBlock ? 'Close shifts, then close the business day' : 'Previous business day still open'}
          </p>
          <p className="mt-0.5 font-caption text-on-surface-variant">
            Day {formatBusinessDateLabel(reminder.openBusinessDate)} is still open, but today is{' '}
            {formatBusinessDateLabel(reminder.currentBusinessDate)} per your business day settings.
            {isShiftBlock
              ? ' Close all cash shifts first, then close the business day and open today.'
              : ' Close the old day and open today so orders and reports stay correct.'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {isShiftBlock && (
          <Link href={`/${slug}/shifts`}>
            <Button variant="outline" className="w-full sm:w-auto">View shifts</Button>
          </Link>
        )}
        <Link href={`/${slug}/business-days`}>
          <Button variant="outline" className="w-full sm:w-auto">Business days</Button>
        </Link>
        <BusinessDayPowerButton />
      </div>
    </div>
  );
}
