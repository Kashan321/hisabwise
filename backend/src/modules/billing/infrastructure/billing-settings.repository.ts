import { prisma } from '../../../shared/database/prisma-client';

const DEFAULT_SETTINGS = {
  id: 'default',
  defaultTrialDays: 14,
  monthlyPrice: 0,
  yearlyPrice: 0,
  currency: 'PKR',
};

export class BillingSettingsRepository {
  async getOrCreate() {
    const existing = await prisma.platformBillingSettings.findUnique({
      where: { id: 'default' },
    });
    if (existing) return existing;

    const created = await prisma.platformBillingSettings.create({ data: DEFAULT_SETTINGS });
    await prisma.$executeRaw`
      UPDATE businesses
      SET trial_ends_at = created_at + interval '14 days'
      WHERE subscription_status = 'TRIAL' AND trial_ends_at IS NULL
    `.catch(() => undefined);
    return created;
  }

  async update(data: {
    defaultTrialDays?: number;
    monthlyPrice?: number;
    yearlyPrice?: number;
    currency?: string;
    bankName?: string | null;
    accountTitle?: string | null;
    accountNumber?: string | null;
    iban?: string | null;
    swiftCode?: string | null;
    paymentInstructions?: string | null;
    gracePeriodDays?: number;
    readOnlyPeriodDays?: number;
  }) {
    await this.getOrCreate();
    return prisma.platformBillingSettings.update({
      where: { id: 'default' },
      data,
    });
  }
}

export const billingSettingsRepository = new BillingSettingsRepository();
