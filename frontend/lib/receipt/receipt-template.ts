import { APP_NAME } from '@/lib/config';
import {
  DEFAULT_RECEIPT_LABELS,
  mergeReceiptLabels,
  type ReceiptCustomBlock,
  type ReceiptTemplateLabels,
} from '@/lib/receipt/receipt-format';

export type { ReceiptCustomBlock, ReceiptCustomBlockPlacement, ReceiptTemplateLabels } from '@/lib/receipt/receipt-format';
export { DEFAULT_RECEIPT_LABELS, RECEIPT_PLACEHOLDER_HINT, RECEIPT_CUSTOM_BLOCK_PLACEMENTS } from '@/lib/receipt/receipt-format';

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
  showLogo: boolean;
  showBusinessName: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showCopyBanner: boolean;
  showOrderNumber: boolean;
  showDateTime: boolean;
  showTableAndOrderType: boolean;
  showOrderTaker: boolean;
  showPromotion: boolean;
  showItemAmounts: boolean;
  showTotals: boolean;
  showPayment: boolean;
  showOrderNotes: boolean;
  showThanksMessage: boolean;
  showBrandLine: boolean;
  showContactLine: boolean;
  customTextTop: string;
  customTextBottom: string;
  labels: ReceiptTemplateLabels;
  /** Optional multi-line layout for order details; uses {placeholders}. Empty = default layout. */
  customerMetaFormat: string;
  customBlocks: ReceiptCustomBlock[];
}

export type ReceiptTemplateOverride = Partial<
  Omit<ReceiptTemplate, 'labels' | 'customBlocks'>
> & {
  labels?: Partial<ReceiptTemplateLabels>;
  customBlocks?: ReceiptCustomBlock[];
};

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
  showLogo: true,
  showBusinessName: true,
  showAddress: true,
  showPhone: true,
  showCopyBanner: true,
  showOrderNumber: true,
  showDateTime: true,
  showTableAndOrderType: true,
  showOrderTaker: true,
  showPromotion: true,
  showItemAmounts: true,
  showTotals: true,
  showPayment: true,
  showOrderNotes: true,
  showThanksMessage: true,
  showBrandLine: true,
  showContactLine: true,
  customTextTop: '',
  customTextBottom: '',
  labels: { ...DEFAULT_RECEIPT_LABELS },
  customerMetaFormat: '',
  customBlocks: [],
};

/** Legacy platform default; treat as 80px so existing tenants get the larger logo without re-saving. */
const LEGACY_LOGO_SIZE_PX = 42;

function normalizeLogoSizePx(px: number): number {
  return px === LEGACY_LOGO_SIZE_PX ? DEFAULT_RECEIPT_TEMPLATE.logoSizePx : px;
}

/** Spread without letting `undefined` wipe defaults (e.g. partial API JSON). */
function definedFields<T extends object>(value: T | null | undefined): Partial<T> {
  if (!value) return {};
  const out: Partial<T> = {};
  for (const key of Object.keys(value) as (keyof T)[]) {
    const v = value[key];
    if (v !== undefined) out[key] = v;
  }
  return out;
}

export function mergeReceiptTemplate(
  platformTemplate: ReceiptTemplate | null | undefined,
  override: ReceiptTemplateOverride | null | undefined,
): ReceiptTemplate {
  const base: ReceiptTemplate = {
    ...DEFAULT_RECEIPT_TEMPLATE,
    ...definedFields(platformTemplate),
    labels: mergeReceiptLabels(
      DEFAULT_RECEIPT_TEMPLATE.labels,
      platformTemplate?.labels,
    ),
    customBlocks: Array.isArray(platformTemplate?.customBlocks)
      ? platformTemplate.customBlocks.slice(0, 12)
      : [],
  };
  base.logoSizePx = normalizeLogoSizePx(base.logoSizePx);
  if (!override) return base;

  const merged: ReceiptTemplate = {
    ...base,
    ...definedFields(override),
    labels: mergeReceiptLabels(base.labels, override.labels),
    customBlocks:
      override.customBlocks !== undefined
        ? override.customBlocks.slice(0, 12)
        : base.customBlocks,
  };
  merged.logoSizePx = normalizeLogoSizePx(merged.logoSizePx);
  return merged;
}
