import type { Order } from '@/lib/api/types';
import type { ReceiptTemplate } from '@/lib/receipt/receipt-template';

export type ReceiptCustomBlockPlacement =
  | 'after_header'
  | 'before_items'
  | 'after_items'
  | 'after_payment'
  | 'before_footer';

export interface ReceiptCustomBlock {
  id: string;
  placement: ReceiptCustomBlockPlacement;
  text: string;
  enabled: boolean;
}

export interface ReceiptTemplateLabels {
  phonePrefix: string;
  tablePrefix: string;
  promotionPrefix: string;
  itemsColumn: string;
  amountColumn: string;
  notesHeading: string;
  paymentHeading: string;
  paymentMethod: string;
  paid: string;
  change: string;
  reference: string;
  subtotal: string;
  tax: string;
  serviceCharge: string;
  deliveryCharge: string;
  discount: string;
  total: string;
  dateTimeSeparator: string;
  orderTakerSeparator: string;
}

export const DEFAULT_RECEIPT_LABELS: ReceiptTemplateLabels = {
  phonePrefix: 'Tel:',
  tablePrefix: 'Table:',
  promotionPrefix: 'Promotion:',
  itemsColumn: 'Item',
  amountColumn: 'Amount',
  notesHeading: 'Notes',
  paymentHeading: 'Payment',
  paymentMethod: 'Payment Method',
  paid: 'Paid',
  change: 'Change',
  reference: 'Reference',
  subtotal: 'Subtotal',
  tax: 'Tax',
  serviceCharge: 'Service charge',
  deliveryCharge: 'Delivery charge',
  discount: 'Discount',
  total: 'TOTAL',
  dateTimeSeparator: ' • ',
  orderTakerSeparator: ': ',
};

export const RECEIPT_PLACEHOLDER_HINT = `{businessName} {address} {phone} {orderNumber} {date} {time} {datetime} {table} {orderType} {orderTaker} {promotion} {notes} {subtotal} {total} {copyBanner} — blank line removes a label prefix when editing labels below`;

export const RECEIPT_CUSTOM_BLOCK_PLACEMENTS: {
  value: ReceiptCustomBlockPlacement;
  label: string;
}[] = [
  { value: 'after_header', label: 'After header' },
  { value: 'before_items', label: 'Before items' },
  { value: 'after_items', label: 'After items' },
  { value: 'after_payment', label: 'After payment' },
  { value: 'before_footer', label: 'Before footer' },
];

export function mergeReceiptLabels(
  base: ReceiptTemplateLabels | undefined,
  patch: Partial<ReceiptTemplateLabels> | undefined,
): ReceiptTemplateLabels {
  return { ...DEFAULT_RECEIPT_LABELS, ...(base ?? {}), ...(patch ?? {}) };
}

export function normalizeCustomBlocks(blocks: ReceiptCustomBlock[] | undefined): ReceiptCustomBlock[] {
  if (!blocks?.length) return [];
  return blocks
    .filter((b) => b.enabled && b.text.trim())
    .slice(0, 12)
    .map((b, i) => ({
      id: b.id || `block-${i}`,
      placement: b.placement,
      text: b.text,
      enabled: true,
    }));
}

export type ReceiptPlaceholderContext = Record<string, string>;

const PLACEHOLDER_RE = /\{([a-zA-Z0-9_]+)\}/g;

export function interpolateReceiptText(
  pattern: string,
  ctx: ReceiptPlaceholderContext,
): string {
  return pattern.replace(PLACEHOLDER_RE, (_, key: string) => ctx[key] ?? '');
}

function cleanupInterpolatedMetaLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return trimmed;
  const parts = trimmed.split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean);
  return parts.join(' | ');
}

/** Collapse lines that are empty after placeholder substitution. */
export function renderFormatLines(pattern: string, ctx: ReceiptPlaceholderContext): string[] {
  return pattern
    .split(/\r?\n/)
    .map((line) => cleanupInterpolatedMetaLine(interpolateReceiptText(line, ctx)))
    .filter(Boolean);
}

export function newCustomBlockId(): string {
  return `cb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function buildReceiptPlaceholderContext(input: {
  order: Order;
  template: ReceiptTemplate;
  tableLabel: string;
  businessName: string;
  addressLine: string;
  phoneLine: string;
  copyBanner: string;
  currency: string;
  formatOrderNumber: (order: Order) => string;
  orderTypeLabel: (order: Order) => string;
  orderTakerLine: (order: Order) => string;
  formatDate: (iso: string) => string;
  formatTime: (iso: string) => string;
  formatMoney: (value: string | number) => string;
}): ReceiptPlaceholderContext {
  const { order, template } = input;
  const date = input.formatDate(order.createdAt);
  const time = input.formatTime(order.createdAt);
  const sep = template.labels.dateTimeSeparator;

  return {
    businessName: input.businessName,
    address: input.addressLine,
    phone: input.phoneLine,
    orderNumber: input.formatOrderNumber(order),
    date,
    time,
    datetime: `${date}${sep}${time}`,
    table: input.tableLabel,
    orderType: input.orderTypeLabel(order),
    orderTaker: input.orderTakerLine(order),
    promotion: order.promotionTitle ?? '',
    notes: order.notes ?? '',
    subtotal: input.formatMoney(order.subtotal),
    total: input.formatMoney(order.totalAmount),
    copyBanner: input.copyBanner,
  };
}
