import { z } from 'zod';
import { APP_NAME } from '../../config/branding';

export const receiptTemplateSchema = z.object({
  thanksMessage: z.string().trim().min(1).max(300),
  brandLine: z.string().trim().min(1).max(200),
  contactLine: z.string().trim().max(200),
  showBarcode: z.boolean(),
  logoSizePx: z.number().int().min(32).max(160),
  customerCopyLabel: z.string().trim().min(1).max(80),
  kitchenCopyLabel: z.string().trim().min(1).max(80),
  receiptWidthMm: z.union([z.literal(58), z.literal(80)]),
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
};

export const receiptTemplateOverrideSchema = receiptTemplateSchema.partial();

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

export function parseReceiptTemplate(value: unknown): ReceiptTemplate | null {
  if (!isRecord(value)) return null;
  const parsed = receiptTemplateSchema.safeParse(pickTemplateFields(value));
  return parsed.success ? parsed.data : null;
}

export function parseReceiptTemplateOverride(value: unknown): ReceiptTemplateOverride | null {
  if (!isRecord(value)) return null;
  const parsed = receiptTemplateOverrideSchema.safeParse(pickTemplateFields(value));
  return parsed.success ? parsed.data : null;
}

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
  if (!override) return receiptTemplateSchema.parse(base);

  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined && value !== null) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  merged.logoSizePx = normalizeLogoSizePx(merged.logoSizePx);
  return receiptTemplateSchema.parse(merged);
}
