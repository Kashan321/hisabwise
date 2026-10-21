import type { Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma-client';
import {
  DEFAULT_RECEIPT_TEMPLATE,
  mergeReceiptTemplate,
  parseReceiptTemplate,
  parseReceiptTemplateOverride,
  receiptTemplateSchema,
  type ReceiptTemplate,
  type ReceiptTemplateOverride,
} from '../../shared/receipt/receipt-template';

export async function ensureDefaultReceiptTemplateRow() {
  const existing = await prisma.receiptTemplate.findFirst({
    where: { isDefault: true },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return existing;

  return prisma.receiptTemplate.create({
    data: {
      name: 'Default',
      description: 'Platform default receipt layout',
      isDefault: true,
      config: DEFAULT_RECEIPT_TEMPLATE,
    },
  });
}

export async function getPlatformReceiptTemplate(): Promise<ReceiptTemplate> {
  const row = await ensureDefaultReceiptTemplateRow();
  return mergeReceiptTemplate(parseReceiptTemplate(row.config), null);
}

export async function updatePlatformReceiptTemplate(
  template: ReceiptTemplate,
): Promise<ReceiptTemplate> {
  const row = await ensureDefaultReceiptTemplateRow();
  const parsed = receiptTemplateSchema.parse(template);
  await prisma.receiptTemplate.update({
    where: { id: row.id },
    data: { config: parsed },
  });
  return parsed;
}

export async function getBusinessReceiptTemplateOverride(
  businessId: string,
): Promise<ReceiptTemplateOverride | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { receiptTemplateOverride: true },
  });
  return parseReceiptTemplateOverride(business?.receiptTemplateOverride);
}

export async function updateBusinessReceiptTemplateOverride(
  businessId: string,
  override: ReceiptTemplateOverride | null,
): Promise<ReceiptTemplateOverride | null> {
  const business = await prisma.business.update({
    where: { id: businessId },
    data: { receiptTemplateOverride: override as Prisma.InputJsonValue },
    select: { receiptTemplateOverride: true },
  });
  return parseReceiptTemplateOverride(business.receiptTemplateOverride);
}

export async function resolveReceiptTemplateForBusiness(
  businessId: string,
): Promise<ReceiptTemplate> {
  const [platformTemplate, business] = await Promise.all([
    getPlatformReceiptTemplate(),
    prisma.business.findUnique({
      where: { id: businessId },
      select: { receiptTemplateOverride: true },
    }),
  ]);

  const override = parseReceiptTemplateOverride(business?.receiptTemplateOverride);
  return mergeReceiptTemplate(platformTemplate, override);
}

export async function getReceiptTemplateBundleForBusiness(businessId: string) {
  const platformTemplate = await getPlatformReceiptTemplate();
  const override = await getBusinessReceiptTemplateOverride(businessId);
  const resolved = mergeReceiptTemplate(platformTemplate, override);

  return {
    platformTemplate,
    override,
    resolved,
    defaults: DEFAULT_RECEIPT_TEMPLATE,
  };
}
