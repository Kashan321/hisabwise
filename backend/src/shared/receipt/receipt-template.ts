import { z } from 'zod';
import { APP_NAME } from '../../config/branding';

export const receiptCustomBlockPlacementSchema = z.enum([
  'after_header',
  'before_items',
  'after_items',
  'after_payment',
  'before_footer',
]);

export const receiptCustomBlockSchema = z.object({
  id: z.string().max(48),
  placement: receiptCustomBlockPlacementSchema,
  text: z.string().max(500),
  enabled: z.boolean(),
});

export const receiptLabelsSchema = z.object({
  phonePrefix: z.string().max(40),
  tablePrefix: z.string().max(40),
  promotionPrefix: z.string().max(40),
  itemsColumn: z.string().max(40),
  amountColumn: z.string().max(40),
  notesHeading: z.string().max(40),
  paymentHeading: z.string().max(40),
  paymentMethod: z.string().max(40),
  paid: z.string().max(40),
  change: z.string().max(40),
  reference: z.string().max(40),
  subtotal: z.string().max(40),
  tax: z.string().max(40),
  serviceCharge: z.string().max(40),
  deliveryCharge: z.string().max(40),
  discount: z.string().max(40),
  total: z.string().max(40),
  dateTimeSeparator: z.string().max(20),
  orderTakerSeparator: z.string().max(20),
});

export type ReceiptTemplateLabels = z.infer<typeof receiptLabelsSchema>;

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

export const receiptTemplateSchema = z.object({
  thanksMessage: z.string().trim().min(1).max(300),
  brandLine: z.string().trim().min(1).max(200),
  contactLine: z.string().trim().max(200),
  showBarcode: z.boolean(),
  logoSizePx: z.number().int().min(32).max(160),
  customerCopyLabel: z.string().trim().min(1).max(80),
  kitchenCopyLabel: z.string().trim().min(1).max(80),
  receiptWidthMm: z.union([z.literal(58), z.literal(80)]),
  /** Customer receipt: show each block when true. Kitchen tickets ignore these (except custom text is customer-only). */
  showLogo: z.boolean(),
  showBusinessName: z.boolean(),
  showAddress: z.boolean(),
  showPhone: z.boolean(),
  showCopyBanner: z.boolean(),
  showOrderNumber: z.boolean(),
  showDateTime: z.boolean(),
  showTableAndOrderType: z.boolean(),
  showOrderTaker: z.boolean(),
  showPromotion: z.boolean(),
  showItemAmounts: z.boolean(),
  showTotals: z.boolean(),
  showPayment: z.boolean(),
  showOrderNotes: z.boolean(),
  showThanksMessage: z.boolean(),
  showBrandLine: z.boolean(),
  showContactLine: z.boolean(),
  /** Freeform lines on customer receipts (after header / before standard footer). */
  customTextTop: z.string().max(800),
  customTextBottom: z.string().max(800),
  labels: receiptLabelsSchema,
  customerMetaFormat: z.string().max(500),
  customBlocks: z.array(receiptCustomBlockSchema).max(12),
});

export type ReceiptTemplate = z.infer<typeof receiptTemplateSchema>;

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

export const receiptTemplateOverrideSchema = receiptTemplateSchema
  .omit({ labels: true, customBlocks: true })
  .partial()
  .extend({
    labels: receiptLabelsSchema.partial().optional(),
    customBlocks: z.array(receiptCustomBlockSchema).max(12).optional(),
  });

export type ReceiptTemplateOverride = z.infer<typeof receiptTemplateOverrideSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickTemplateFields(value: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of Object.keys(receiptTemplateSchema.shape)) {
    if (value[key] !== undefined) {
      picked[key] = value[key];
    }
  }
  return picked;
}

function mergeLabels(
  base: ReceiptTemplateLabels,
  patch: unknown,
): ReceiptTemplateLabels {
  if (!isRecord(patch)) return { ...base };
  const merged: Record<string, unknown> = { ...base };
  for (const key of Object.keys(receiptLabelsSchema.shape)) {
    const val = patch[key];
    if (typeof val === 'string') merged[key] = val;
  }
  const parsed = receiptLabelsSchema.safeParse(merged);
  return parsed.success ? parsed.data : { ...base };
}

/** Merge platform defaults before API/body validation (JSON may omit new fields or send partial labels). */
export function normalizeReceiptTemplateInput(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const picked = pickTemplateFields(input);
  return {
    ...DEFAULT_RECEIPT_TEMPLATE,
    ...picked,
    labels: mergeLabels(DEFAULT_RECEIPT_LABELS, picked.labels ?? input.labels),
    customBlocks: Array.isArray(picked.customBlocks) ? picked.customBlocks : [],
    customTextTop: typeof picked.customTextTop === 'string' ? picked.customTextTop : '',
    customTextBottom: typeof picked.customTextBottom === 'string' ? picked.customTextBottom : '',
    customerMetaFormat:
      typeof picked.customerMetaFormat === 'string' ? picked.customerMetaFormat : '',
  };
}

export function readReceiptTemplateConfig(config: unknown): ReceiptTemplate {
  const parsed = receiptTemplateSchema.safeParse(normalizeReceiptTemplateInput(config));
  return parsed.success ? parsed.data : receiptTemplateSchema.parse(DEFAULT_RECEIPT_TEMPLATE);
}

export function parseReceiptTemplate(value: unknown): ReceiptTemplate | null {
  if (!isRecord(value)) return null;
  const parsed = receiptTemplateSchema.safeParse(normalizeReceiptTemplateInput(value));
  return parsed.success ? parsed.data : null;
}

export function parseReceiptTemplateOverride(value: unknown): ReceiptTemplateOverride | null {
  if (!isRecord(value)) return null;
  const picked = pickTemplateFields(value);
  const parsed = receiptTemplateOverrideSchema.safeParse(picked);
  if (!parsed.success) return null;
  return parsed.data as ReceiptTemplateOverride;
}

const LEGACY_LOGO_SIZE_PX = 42;

function normalizeLogoSizePx(px: number): number {
  return px === LEGACY_LOGO_SIZE_PX ? DEFAULT_RECEIPT_TEMPLATE.logoSizePx : px;
}

export function mergeReceiptTemplate(
  platformTemplate: ReceiptTemplate | null | undefined,
  override: ReceiptTemplateOverride | null | undefined,
): ReceiptTemplate {
  const base = readReceiptTemplateConfig(platformTemplate ?? DEFAULT_RECEIPT_TEMPLATE);
  base.logoSizePx = normalizeLogoSizePx(base.logoSizePx);
  if (!override) return base;

  const overrideFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined && value !== null) overrideFields[key] = value;
  }
  const merged: ReceiptTemplate = {
    ...base,
    ...(overrideFields as ReceiptTemplate),
    labels: mergeLabels(base.labels, override.labels),
    customBlocks:
      override.customBlocks !== undefined ? override.customBlocks.slice(0, 12) : base.customBlocks,
  };
  merged.logoSizePx = normalizeLogoSizePx(merged.logoSizePx);
  return receiptTemplateSchema.parse(normalizeReceiptTemplateInput(merged));
}
