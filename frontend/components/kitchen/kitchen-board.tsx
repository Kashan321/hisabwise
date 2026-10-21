'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon, Skeleton, Spinner } from '@/components/ui';
import { elapsedTimer, isTimerWarning } from '@/components/orders/order-badges';
import { formatOrderLabel, orderTakerName } from '@/lib/order-display';
import type { Order } from '@/lib/api/types';
import {
  networkStatusIcon,
  networkStatusLabel,
  type NetworkStatus,
} from '@/lib/hooks/use-network-status';

export type KdsStatus = 'RECEIVED' | 'PREPARING' | 'READY';

export const KDS_ADVANCE: Record<string, { next: string; label: string; tone: string }> = {
  RECEIVED: { next: 'PREPARING', label: 'Start prep', tone: 'kds-bump--start' },
  PREPARING: { next: 'READY', label: 'Mark ready', tone: 'kds-bump--ready' },
  READY: { next: 'CLEARED', label: 'Clear ticket', tone: 'kds-bump--clear' },
};

const COLUMN_META: Record<
  KdsStatus,
  { title: string; subtitle: string; accent: string; icon: string }
> = {
  RECEIVED: {
    title: 'New tickets',
    subtitle: 'Oldest on top · bump moves queue up',
    accent: 'kds-column--received',
    icon: 'inbox',
  },
  PREPARING: {
    title: 'On the line',
    subtitle: 'Cooking now',
    accent: 'kds-column--preparing',
    icon: 'skillet',
  },
  READY: {
    title: 'Ready to serve',
    subtitle: 'Waiting for pickup',
    accent: 'kds-column--ready',
    icon: 'room_service',
  },
};

export function sortKitchenOrders(orders: Order[]): Order[] {
  return [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function LiveTimer({ createdAt }: { createdAt: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{elapsedTimer(createdAt)}</>;
}

export function KitchenTicket({
  order,
  tableLabel,
  position,
  totalInColumn,
  onBump,
  onPrint,
  onDragStart,
  onDragEnd,
  isDragging,
  bumping,
  printing,
}: {
  order: Order;
  tableLabel: string;
  position: number;
  totalInColumn: number;
  onBump: () => void;
  onPrint: () => void;
  onDragStart: (orderId: string) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
  bumping?: boolean;
  printing?: boolean;
}) {
  const adv = KDS_ADVANCE[order.status];
  const isOldest = position === 0 && totalInColumn > 1;
  const isNewest = position === totalInColumn - 1 && totalInColumn > 1;
  const urgent = isTimerWarning(order.createdAt);
  const isReady = order.status === 'READY';

  return (
    <article
      className={`kds-ticket ${isReady ? 'kds-ticket--ready' : ''} ${isDragging ? 'kds-ticket--dragging' : ''} ${urgent ? 'kds-ticket--urgent' : ''} ${isOldest ? 'kds-ticket--oldest' : ''}`}
    >
      <div className="kds-ticket__accent" aria-hidden="true" />

      <div className="kds-ticket__shell">
        <div
          className="kds-ticket__body"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/order-id', order.id);
            e.dataTransfer.setData('text/order-status', order.status);
            e.dataTransfer.effectAllowed = 'move';
            onDragStart(order.id);
          }}
          onDragEnd={onDragEnd}
        >
        <header className="kds-ticket__head">
          <div className="kds-ticket__head-main">
            <p className="kds-ticket__table">{tableLabel}</p>
            <p className="kds-ticket__order">{formatOrderLabel(order)}</p>
            {order.batchLabel && (
              <p className="kds-ticket__batch">{order.batchLabel}</p>
            )}
          </div>
          <div className="kds-ticket__head-side">
            {(isOldest || isNewest) && (
              <span
                className={`kds-ticket__badge ${isOldest ? 'kds-ticket__badge--old' : 'kds-ticket__badge--new'}`}
              >
                {isOldest ? 'Oldest' : 'New'}
              </span>
            )}
            <div className="kds-ticket__head-tools">
              <button
                type="button"
                disabled={printing || bumping}
                onClick={onPrint}
                className="kds-ticket__print kds-ticket__print--compact"
                aria-label="Print kitchen ticket"
                title="Print ticket"
              >
                {printing ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Icon name="print" className="text-base" />
                )}
              </button>
              <div className={`kds-ticket__timer ${urgent ? 'kds-ticket__timer--urgent' : ''}`}>
                <Icon name="schedule" className="text-base shrink-0" />
                <LiveTimer createdAt={order.createdAt} />
              </div>
            </div>
          </div>
        </header>

        <div className="kds-ticket__meta">
          <span>{order.source === 'QR_CUSTOMER' ? 'QR order' : 'Staff order'}</span>
          {orderTakerName(order) && <span>· {orderTakerName(order)}</span>}
          {order.orderType && <span>· {order.orderType.replace(/_/g, ' ')}</span>}
        </div>
        {order.preparedByName && (
          <p className="kds-ticket__chef">
            <Icon name="restaurant" className="text-sm shrink-0" />
            Chef: {order.preparedByName}
          </p>
        )}

        <ul className="kds-ticket__items">
          {order.items?.map((item) => {
            const extras = [
              ...(item.variantName ? [item.variantName] : []),
              ...(item.modifiers?.map((m) => m.modifierName) ?? []),
            ];
            return (
              <li key={item.id} className="kds-ticket__item">
                <span className="kds-ticket__qty">{item.quantity}×</span>
                <div className="min-w-0">
                  <p className="kds-ticket__item-name">{item.menuItemName}</p>
                  {extras.map((line) => (
                    <p key={line} className="kds-ticket__item-extra">{line}</p>
                  ))}
                  {item.customizationNotes && (
                    <p className="kds-ticket__item-note">{item.customizationNotes}</p>
                  )}
                </div>
              </li>
            );
          })}
          {!order.items?.length && <li className="kds-ticket__item-empty">No items</li>}
        </ul>

        {order.notes && <p className="kds-ticket__notes">Note: {order.notes}</p>}
        </div>

        {adv && (
          <footer className="kds-ticket__actions kds-ticket__actions--single">
            <button
              type="button"
              disabled={bumping}
              onClick={onBump}
              className={`kds-bump ${adv.tone}`}
            >
              {bumping ? <Spinner className="h-5 w-5" /> : (
                <>
                  <span>{adv.label}</span>
                  <Icon name="arrow_upward" className="text-lg" />
                </>
              )}
            </button>
          </footer>
        )}
      </div>
    </article>
  );
}

export function KitchenColumn({
  status,
  orders,
  tableMap,
  dropActive,
  onBump,
  onPrint,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  draggingOrderId,
  pendingOrderId,
  printingOrderId,
}: {
  status: KdsStatus;
  orders: Order[];
  tableMap: Record<string, string>;
  dropActive: boolean;
  onBump: (id: string, status: string) => void;
  onPrint: (order: Order) => void;
  onDragStart: (orderId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, status: KdsStatus) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: KdsStatus) => void;
  draggingOrderId: string | null;
  pendingOrderId?: string | null;
  printingOrderId: string | null;
}) {
  const meta = COLUMN_META[status];

  return (
    <section
      className={`kds-column ${meta.accent} ${dropActive ? 'kds-column--drop' : ''}`}
      onDragOver={(e) => onDragOver(e, status)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, status)}
    >
      <header className="kds-column__header">
        <div className="kds-column__title-row">
          <div className="kds-column__icon">
            <Icon name={meta.icon} className="text-xl" />
          </div>
          <div className="min-w-0">
            <h2 className="kds-column__title">{meta.title}</h2>
            <p className="kds-column__subtitle">{meta.subtitle}</p>
          </div>
          <span className="kds-column__count">{orders.length}</span>
        </div>
        {orders.length > 0 && (
          <div className="kds-column__flow-hint">
            <span>↑ Oldest</span>
            <span className="kds-column__flow-line" />
            <span>New ↓</span>
          </div>
        )}
        {dropActive && <p className="kds-column__drop-hint">Release to move here</p>}
      </header>

      <div className="kds-column__list">
        {orders.length === 0 ? (
          <div className="kds-column__empty">
            <Icon name="check_circle" className="text-3xl opacity-40" />
            <p>All clear</p>
          </div>
        ) : (
          orders.map((order, index) => (
            <KitchenTicket
              key={order.id}
              order={order}
              tableLabel={
                order.tableId
                  ? tableMap[order.tableId] ?? '—'
                  : status === 'READY'
                    ? 'Pickup'
                    : 'Counter'
              }
              position={index}
              totalInColumn={orders.length}
              onBump={() => onBump(order.id, order.status)}
              onPrint={() => onPrint(order)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={draggingOrderId === order.id}
              bumping={pendingOrderId === order.id}
              printing={printingOrderId === order.id}
            />
          ))
        )}
      </div>
    </section>
  );
}

export function KitchenHeader({
  slug,
  clock,
  network,
  received,
  preparing,
  ready,
  exitHref,
  showLogout,
  onLogout,
}: {
  slug: string;
  clock: string;
  network: NetworkStatus;
  received: number;
  preparing: number;
  ready: number;
  exitHref: string | null;
  showLogout?: boolean;
  onLogout?: () => void | Promise<void>;
}) {
  const quality = network.quality;
  const dotClass =
    quality === 'connected' || quality === 'syncing'
      ? 'bg-emerald-500'
      : quality === 'degraded'
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <header className="kds-header">
      <div className="kds-header__left">
        <div className="kds-header__brand">
          <Icon name="skillet" className="kds-header__brand-icon text-2xl" />
          <div>
            <h1 className="kds-header__title">Kitchen line</h1>
            <p className="kds-header__venue">{slug.replace(/-/g, ' ')}</p>
          </div>
        </div>
        <div className="kds-header__stats">
          <span className="kds-stat kds-stat--received">{received} new</span>
          <span className="kds-stat kds-stat--preparing">{preparing} cooking</span>
          <span className="kds-stat kds-stat--ready">{ready} ready</span>
        </div>
      </div>

      <div className="kds-header__right">
        <div className="kds-header__clock">
          <span className="kds-header__clock-value">{clock}</span>
          <span className="kds-header__clock-label">Live</span>
        </div>
        <div className="kds-header__network" title={networkStatusLabel(network)}>
          <span className={`kds-header__dot ${dotClass}`} />
          <Icon
            name={networkStatusIcon(network)}
            className={`text-lg ${quality === 'syncing' ? 'animate-spin' : ''}`}
          />
          <span className="kds-header__network-label">{networkStatusLabel(network)}</span>
        </div>
        {exitHref && (
          <Link href={exitHref} className="kds-header__exit">
            <Icon name="arrow_back" />
            <span className="kds-header__exit-label">Exit</span>
          </Link>
        )}
        {showLogout && onLogout && (
          <button type="button" onClick={() => void onLogout()} className="kds-header__exit">
            <Icon name="logout" />
            <span className="kds-header__exit-label">Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}

export function KitchenLoading() {
  return (
    <main className="kds-main">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="kds-column kds-column--received flex-1 p-4 space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ))}
    </main>
  );
}

export function KitchenMobileTabs({
  active,
  onChange,
  counts,
}: {
  active: KdsStatus;
  onChange: (status: KdsStatus) => void;
  counts: Record<KdsStatus, number>;
}) {
  return (
    <div className="kds-mobile-tabs">
      {(
        [
          { status: 'RECEIVED' as KdsStatus, label: 'New' },
          { status: 'PREPARING' as KdsStatus, label: 'Cooking' },
          { status: 'READY' as KdsStatus, label: 'Ready' },
        ] as const
      ).map((tab) => (
        <button
          key={tab.status}
          type="button"
          onClick={() => onChange(tab.status)}
          className={`kds-mobile-tab ${active === tab.status ? 'kds-mobile-tab--active' : ''}`}
        >
          {tab.label}
          <span className="kds-mobile-tab__count">{counts[tab.status]}</span>
        </button>
      ))}
    </div>
  );
}
