'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { OrderStatusBadge, timeAgo } from '@/components/orders/order-badges';
import { statusLabel } from '@/components/floor-plan/table-node';
import { Icon } from '@/components/ui';
import type { FloorTable, Order } from '@/lib/api/types';
import { useOrder } from '@/lib/hooks/queries';
import { useFormatMoney } from '@/lib/hooks/use-business-currency';
import { formatOrderLabel, orderTakerName } from '@/lib/order-display';
import { canAddItemsToOpenTab, posAddItemsHref } from '@/lib/open-tab-order';

const POPOVER_WIDTH = 288;
const VIEWPORT_PAD = 12;
const TABLE_GAP = 10;

function clampPopoverPosition(
  centerX: number,
  tableTopY: number,
  tableBottomY: number,
  popoverHeight: number,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(POPOVER_WIDTH, vw - VIEWPORT_PAD * 2);
  const maxHeight = Math.min(popoverHeight, vh - VIEWPORT_PAD * 2);

  let left = centerX - width / 2;
  left = Math.max(VIEWPORT_PAD, Math.min(left, vw - width - VIEWPORT_PAD));

  const spaceBelow = vh - VIEWPORT_PAD - tableBottomY - TABLE_GAP;
  const spaceAbove = tableTopY - VIEWPORT_PAD - TABLE_GAP;

  let top: number;
  if (spaceBelow >= maxHeight || spaceBelow >= spaceAbove) {
    top = tableBottomY + TABLE_GAP;
  } else {
    top = tableTopY - TABLE_GAP - maxHeight;
  }

  if (top + maxHeight > vh - VIEWPORT_PAD) {
    top = vh - VIEWPORT_PAD - maxHeight;
  }
  if (top < VIEWPORT_PAD) {
    top = VIEWPORT_PAD;
  }

  return { top, left };
}

export function TableSelectionPopover({
  table,
  position,
  size,
  canvasRef,
  displayScale,
  slug,
  activeOrder,
  onCycleStatus,
  onClose,
}: {
  table: FloorTable;
  position: { x: number; y: number };
  size: { width: number; height: number };
  canvasRef: React.RefObject<HTMLDivElement | null>;
  displayScale: number;
  slug: string;
  activeOrder?: Order;
  onCycleStatus: () => void;
  onClose: () => void;
}) {
  const formatMoney = useFormatMoney();
  const popoverRef = useRef<HTMLDivElement>(null);
  const { data: orderDetail, isLoading: orderLoading } = useOrder(activeOrder?.id ?? '');
  const order = orderDetail ?? activeOrder;
  const [style, setStyle] = useState<{ top: number; left: number }>({
    top: VIEWPORT_PAD,
    left: VIEWPORT_PAD,
  });

  useLayoutEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useLayoutEffect(() => {
    function update() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + (position.x + size.width / 2) * displayScale;
      const tableTopY = rect.top + position.y * displayScale;
      const tableBottomY = rect.top + (position.y + size.height) * displayScale;
      const popoverHeight = popoverRef.current?.offsetHeight ?? (activeOrder ? 340 : 160);

      setStyle(clampPopoverPosition(centerX, tableTopY, tableBottomY, popoverHeight));
    }

    update();
    const raf = requestAnimationFrame(update);

    const ro = new ResizeObserver(update);
    if (popoverRef.current) ro.observe(popoverRef.current);

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [
    canvasRef,
    position.x,
    position.y,
    size.width,
    size.height,
    displayScale,
    activeOrder,
    orderLoading,
    order?.items?.length,
  ]);

  if (typeof document === 'undefined') return null;

  const taker = order ? orderTakerName(order) : null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[199] cursor-default bg-black/5"
        aria-label="Close table details"
        onClick={onClose}
      />
      <div
        ref={popoverRef}
        className="fixed z-[200] w-72 max-w-[calc(100vw-24px)] max-h-[calc(100vh-24px)] overflow-y-auto bg-surface-container-lowest border border-outline-variant/30 rounded-2xl popover-shadow p-4 pointer-events-auto"
        style={{ top: style.top, left: style.left }}
      >
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="min-w-0">
            <h4 className="font-body-emphasis text-primary">Table {table.tableIdentifier}</h4>
            <p className="font-caption text-on-surface-variant">
              {table.capacity} seats · {table.shape?.toLowerCase() ?? 'round'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
            aria-label="Close"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>

        {activeOrder ? (
          <div className="space-y-3">
            {orderLoading && !order?.items?.length ? (
              <p className="font-caption text-on-surface-variant py-2">Loading order…</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-body-emphasis text-primary">{formatOrderLabel(order!)}</span>
                  <OrderStatusBadge status={order!.status} />
                </div>

                <p className="font-caption text-on-surface-variant">
                  {timeAgo(order!.createdAt)}
                  {taker ? ` · Taken by ${taker}` : ''}
                </p>

                <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low/50 max-h-36 overflow-y-auto">
                  <ul className="divide-y divide-outline-variant/10">
                    {(order!.items ?? []).map((item) => (
                      <li key={item.id} className="px-3 py-2">
                        <div className="flex justify-between gap-2 font-caption">
                          <span className="text-on-surface min-w-0">
                            <span className="font-body-emphasis">{item.quantity}×</span> {item.menuItemName}
                          </span>
                          <span className="text-on-surface-variant shrink-0">
                            {formatMoney(item.lineTotal)}
                          </span>
                        </div>
                        {item.variantName && (
                          <p className="font-caption text-on-surface-variant mt-0.5">{item.variantName}</p>
                        )}
                        {(item.modifiers ?? []).map((mod) => (
                          <p key={mod.id ?? mod.modifierName} className="font-caption text-on-surface-variant">
                            + {mod.modifierName}
                          </p>
                        ))}
                        {item.customizationNotes && (
                          <p className="font-caption text-secondary mt-0.5">{item.customizationNotes}</p>
                        )}
                      </li>
                    ))}
                    {(order!.items ?? []).length === 0 && (
                      <li className="px-3 py-2 font-caption text-on-surface-variant">No items listed</li>
                    )}
                  </ul>
                </div>

                {order!.notes && (
                  <p className="font-caption text-on-surface-variant border-l-2 border-secondary pl-2">
                    {order!.notes}
                  </p>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-outline-variant/15">
                  <span className="font-caption text-on-surface-variant">Total</span>
                  <span className="font-body-emphasis text-primary">{formatMoney(order!.totalAmount)}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {canAddItemsToOpenTab(order!) && (
                    <Link
                      href={posAddItemsHref(slug, order!)}
                      className="w-full py-2 text-center font-body-emphasis rounded-lg bg-secondary text-on-secondary hover:opacity-90 flex items-center justify-center gap-1"
                    >
                      <Icon name="add" className="text-sm" />
                      Add items
                    </Link>
                  )}
                  <Link
                    href={`/${slug}/orders`}
                    className="w-full py-2 text-center font-caption text-primary hover:underline flex items-center justify-center gap-1"
                  >
                    Open in live orders
                    <Icon name="open_in_new" className="text-sm" />
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-caption text-secondary font-bold capitalize">{statusLabel(table.status)}</p>
            <button
              type="button"
              onClick={onCycleStatus}
              className="w-full py-2 bg-primary-container text-on-primary-container font-caption font-bold rounded-lg hover:bg-primary hover:text-on-primary transition-colors"
            >
              Cycle status
            </button>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
