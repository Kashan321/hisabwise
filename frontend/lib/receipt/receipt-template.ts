import { APP_NAME } from '@/lib/config';

/** Max logo width on an 80mm roll (~300px printable); keep in sync with backend receipt-template schema. */
export const RECEIPT_LOGO_SIZE_PX_MIN = 32;
export const RECEIPT_LOGO_SIZE_PX_MAX = 160;

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
  logoSizePx: 80,
  customerCopyLabel: 'Customer Copy',
  kitchenCopyLabel: 'Kitchen Copy',
  receiptWidthMm: 80,
};

/** Legacy platform default; treat as 80px so existing tenants get the larger logo without re-saving. */
const LEGACY_LOGO_SIZE_PX = 42;

function normalizeLogoSizePx(px: number): number {
  return px === LEGACY_LOGO_SIZE_PX ? DEFAULT_RECEIPT_TEMPLATE.logoSizePx : px;
}

export function mergeReceiptTemplate(
  platformTemplate: ReceiptTemplate | null | undefined,
  override: ReceiptTemplateOverride | null | undefined,
): ReceiptTemplate {
  const base = { ...DEFAULT_RECEIPT_TEMPLATE, ...(platformTemplate ?? {}) };
  base.logoSizePx = normalizeLogoSizePx(base.logoSizePx);
  if (!override) return base;
  const merged = { ...base, ...override };
  merged.logoSizePx = normalizeLogoSizePx(merged.logoSizePx);
  return merged;
}
