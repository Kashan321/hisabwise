'use client';

import Link from 'next/link';
import { Button, Icon, IconButton } from '@/components/ui';
import type { Order } from '@/lib/api/types';
import { canAddItemsToOpenTab, posAddItemsHref } from '@/lib/open-tab-order';

export function OrderRowActions({
  slug,
  order,
  statusAction,
  isStatusBusy,
  isPrintBusy,
  onView,
  onPrint,
  onAdvanceStatus,
  onCancel,
  compact = false,
  hideView,
  dense,
  labeledActions,
}: {
  slug: string;
  order: Order;
  statusAction: string | null;
  isStatusBusy: boolean;
  isPrintBusy: boolean;
  onView: () => void;
  onPrint: () => void;
  onAdvanceStatus: () => void;
  onCancel: () => void;
  compact?: boolean;
  hideView?: boolean;
  /** Extra-tight row for POS live-order stripe. */
  dense?: boolean;
  /** Show short text labels on print/add (POS stripe). */
  labeledActions?: boolean;
}) {
  const canAdd = canAddItemsToOpenTab(order);
  const canCancel = !['COMPLETED', 'CANCELLED'].includes(order.status);

  if (compact) {
    const shortAction =
      statusAction === 'Start Prep'
        ? 'Prep'
        : statusAction === 'Mark Ready'
          ? 'Ready'
          : statusAction;

    return (
      <div className="flex items-center justify-between gap-1 w-full">
        <div className="inline-flex items-center gap-0.5 flex-nowrap min-w-0">
        {!hideView && (
          <IconButton
            title="View"
            onClick={onView}
            className="text-on-surface-variant hover:text-primary hover:bg-primary/10"
          >
            <Icon name="visibility" className="text-[18px]" />
          </IconButton>
        )}
        {labeledActions ? (
          <button
            type="button"
            title="Print bill"
            disabled={isPrintBusy}
            onClick={onPrint}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-on-surface-variant hover:text-primary hover:bg-primary/10"
          >
            <Icon name="print" className="text-[14px]" />
            Print
          </button>
        ) : (
          <IconButton
            title="Print bill"
            loading={isPrintBusy}
            onClick={onPrint}
            className={`text-on-surface-variant hover:text-primary hover:bg-primary/10 ${
              dense ? '!w-6 !h-6 !min-w-6' : ''
            }`}
          >
            <Icon name="print" className={dense ? 'text-[16px]' : 'text-[18px]'} />
          </IconButton>
        )}
        {canAdd && (
          labeledActions ? (
            <Link
              href={posAddItemsHref(slug, order)}
              title="Add items"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-on-surface-variant hover:text-secondary hover:bg-secondary/10"
            >
              <Icon name="add" className="text-[14px]" />
              Add
            </Link>
          ) : (
            <Link href={posAddItemsHref(slug, order)} title="Add items">
              <IconButton
                title="Add items"
                className={`text-on-surface-variant hover:text-secondary hover:bg-secondary/10 ${
                  dense ? '!w-6 !h-6 !min-w-6' : ''
                }`}
              >
                <Icon name="add" className={dense ? 'text-[16px]' : 'text-[18px]'} />
              </IconButton>
            </Link>
          )
        )}
        </div>
        <div className="inline-flex items-center gap-0.5 flex-nowrap shrink-0">
          {statusAction && (
            <Button
              type="button"
              variant={order.status === 'READY' ? 'primary' : 'outline'}
              disabled={isStatusBusy}
              loading={isStatusBusy}
              className={`!px-2 !py-0 whitespace-nowrap ${
                dense
                  ? '!h-6 !text-[10px] !rounded'
                  : '!py-0.5 !h-7 !text-[11px] !rounded-md'
              }`}
              onClick={onAdvanceStatus}
            >
              {shortAction}
            </Button>
          )}
          {canCancel && (
            <IconButton
              title="Cancel order"
              disabled={isStatusBusy}
              onClick={onCancel}
              className={`text-error hover:bg-error-container/30 ${
                dense ? '!w-6 !h-6 !min-w-6' : '!w-7 !h-7'
              }`}
            >
              <Icon name="close" className={dense ? 'text-[14px]' : 'text-[16px]'} />
            </IconButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" type="button" className="tap-target" onClick={onView}>
        View
      </Button>
      {canAdd && (
        <Link href={posAddItemsHref(slug, order)}>
          <Button variant="secondary" type="button" className="tap-target">
            Add items
          </Button>
        </Link>
      )}
      {statusAction && (
        <Button
          type="button"
          variant="primary"
          loading={isStatusBusy}
          className="tap-target"
          onClick={onAdvanceStatus}
        >
          {statusAction}
        </Button>
      )}
      {canCancel && (
        <Button
          type="button"
          variant="outline"
          disabled={isStatusBusy}
          className="tap-target text-error border-error/30"
          onClick={onCancel}
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
