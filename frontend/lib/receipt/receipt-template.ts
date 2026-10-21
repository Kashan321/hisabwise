import { APP_NAME } from '@/lib/config';

export interface ReceiptTemplate {
  thanksMessage: string;
  brandLine: string;
  contactLine: string;
  showBarcode: boolean;
  logoSizePx: number;
  customerCopyLabel: string;
  kitchenCopyLabel: string;
  receiptWidthMm: 58 | 80;
}

export type ReceiptTemplateOverride = Partial<ReceiptTemplate>;

export interface ReceiptTemplateBundle {
  platformTemplate: ReceiptTemplate;
  override: ReceiptTemplateOverride | null;
  resolved: ReceiptTemplate;
  defaults: ReceiptTemplate;
}

export const DEFAULT_RECEIPT_TEMPLATE: ReceiptTemplate = {
  thanksMessage: 'Thank you! Please come again.',
  brandLine: `${APP_NAME} powered by Nasmak Labs`,
  contactLine: '03256955674 nasmaklabs.com',
  showBarcode: true,
  logoSizePx: 42,
  customerCopyLabel: 'Customer Copy',
  kitchenCopyLabel: 'Kitchen Copy',
  receiptWidthMm: 80,
};

export function mergeReceiptTemplate(
  platformTemplate: ReceiptTemplate | null | undefined,
  override: ReceiptTemplateOverride | null | undefined,
): ReceiptTemplate {
  const base = { ...DEFAULT_RECEIPT_TEMPLATE, ...(platformTemplate ?? {}) };
  if (!override) return base;
  return { ...base, ...override };
}
