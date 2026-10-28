import { Icon, timeAgo } from '@/components/ui';
import { paymentMethodLabel } from '@/lib/payment-methods';
import type { Order, OrderType } from '@/lib/api/types';
import { formatOrderItemShortLabel } from '@/lib/order-item-display';

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: 'Dine In',
  TAKEAWAY: 'Takeaway',
  DELIVERY: 'Delivery',
  QR: 'QR',
};

const ORDER_TYPE_ICONS: Record<string, string> = {
  DINE_IN: 'restaurant',
  TAKEAWAY: 'shopping_bag',
  DELIVERY: 'delivery_dining',
  QR: 'qr_code_2',
};

const ORDER_TYPE_STYLES: Record<string, string> = {
  DINE_IN: 'bg-primary-container/35 text-primary border-primary/15',
  TAKEAWAY: 'bg-secondary-fixed/50 text-on-secondary-fixed border-secondary/20',
  DELIVERY: 'bg-tertiary-fixed/40 text-on-tertiary-fixed-variant border-tertiary/20',
  QR: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
};

export function formatOrderTypeLabel(orderType?: OrderType | string | null): string {
  if (!orderType) return ORDER_TYPE_LABELS.DINE_IN;
  return ORDER_TYPE_LABELS[orderType] ?? orderType.replace(/_/g, ' ');
}

/** Dine-in with table when known; otherwise Takeaway / Delivery / QR. */
export function orderServiceSummary(
  order: Pick<Order, 'orderType' | 'tableIdentifier'>,
  resolvedTable?: string,
): string {
  const type = order.orderType ?? 'DINE_IN';
  const label = formatOrderTypeLabel(type);
  if (type === 'DINE_IN') {
    const table = order.tableIdentifier ?? resolvedTable;
    if (table && table !== '—') return `${label} · ${table}`;
  }
  return label;
}

export function OrderTypeBadge({
  orderType,
  compact,
}: {
  orderType?: OrderType | string | null;
  /** Tighter chip for dense lists (cards, drawer). */
  compact?: boolean;
}) {
  const key = orderType ?? 'DINE_IN';
  const label = formatOrderTypeLabel(key);
  const icon = ORDER_TYPE_ICONS[key] ?? 'receipt';
  const style = ORDER_TYPE_STYLES[key] ?? ORDER_TYPE_STYLES.DINE_IN;
  return (
    <span
      className={`inline-flex max-w-max items-center whitespace-nowrap border ${style} ${
        compact
          ? 'gap-0.5 rounded px-1.5 py-px text-[10px] font-semibold leading-none'
          : 'gap-1 rounded px-2 py-0.5 text-[11px] font-bold'
      }`}
      title={label}
    >
      <Icon name={icon} className={compact ? 'text-[11px]' : 'text-[12px]'} />
      {label}
    </span>
  );
}

export function OrderStatusBadge({ status, compact }: { status: string; compact?: boolean }) {
  const styles: Record<string, string> = {
    PREPARING: 'bg-[#fff7ed] text-[#8c4f10] border-[#ffedd5]',
    READY: 'bg-[#f0fdf4] text-[#166534] border-[#dcfce7]',
    RECEIVED: 'bg-surface-container-highest text-on-surface-variant border-outline-variant',
    COMPLETED: 'bg-surface-container-highest text-on-surface-variant border-outline-variant',
    CANCELLED: 'bg-error-container/30 text-on-error-container border-error-container',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold border ${
        compact
          ? 'px-1.5 py-0 text-[9px] leading-tight shadow-none'
          : 'px-2 py-0.5 text-[11px] shadow-sm'
      } ${styles[status] ?? styles.RECEIVED}`}
    >
      {status}
    </span>
  );
}

export function OrderSourceBadge({ source }: { source: string }) {
  const isQr = source === 'QR_CUSTOMER';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
        isQr
          ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
          : 'bg-surface-container-highest text-on-surface-variant'
      }`}
    >
      <Icon name={isQr ? 'qr_code_2' : 'person'} className="text-[12px]" />
      {isQr ? 'QR' : 'STAFF'}
    </span>
  );
}

export function PaymentMethodBadge({ method }: { method: string }) {
  const icons: Record<string, string> = {
    CASH: 'payments',
    CARD: 'credit_card',
    ONLINE: 'smartphone',
    OTHER: 'more_horiz',
  };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-primary-container/40 text-primary border border-primary/20">
      <Icon name={icons[method] ?? 'payments'} className="text-[12px]" />
      {paymentMethodLabel(method)}
    </span>
  );
}

export function orderActionLabel(status: string): string | null {
  if (status === 'PREPARING') return 'Mark Ready';
  if (status === 'READY') return 'Deliver';
  if (status === 'RECEIVED') return 'Start Prep';
  return null;
}

export function orderNextStatus(status: string): string | null {
  const map: Record<string, string> = {
    RECEIVED: 'PREPARING',
    PREPARING: 'READY',
    READY: 'COMPLETED',
  };
  return map[status] ?? null;
}

function formatOrderItemLine(item: NonNullable<Order['items']>[number]): string {
  return formatOrderItemShortLabel(item);
}

export function formatOrderItems(order: Order): string {
  const items = order.items ?? [];
  const original = items.filter((i) => !i.isKitchenAddition);
  const display = original.length > 0 ? original : items;
  const text = display.map(formatOrderItemLine).join(', ');
  return text || '—';
}

export function formatAddedOrderItems(order: Order): string | null {
  const added = order.items?.filter((i) => i.isKitchenAddition) ?? [];
  if (!added.length) return null;
  return added.map(formatOrderItemLine).join(', ');
}

export function OrderItemsSummary({
  order,
  className,
  mainClassName,
  addedClassName,
}: {
  order: Order;
  className?: string;
  mainClassName?: string;
  addedClassName?: string;
}) {
  const added = formatAddedOrderItems(order);
  return (
    <div className={className}>
      <p className={mainClassName}>{formatOrderItems(order)}</p>
      {added && (
        <p className={addedClassName ?? 'text-[11px] text-primary font-medium mt-0.5 line-clamp-1'}>
          + {added}
        </p>
      )}
    </div>
  );
}

export function elapsedTimer(createdAt: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  const days = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (days > 0) return days === 1 ? '1 day' : `${days} days`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function isTimerWarning(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > 10 * 60 * 1000;
}

export { timeAgo };
