import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma-client';
import { billingSettingsRepository } from './billing-settings.repository';
import { BusinessNotFoundError } from '../../tenants/domain/errors/tenant.errors';
import {
  calculateRenewalPricing,
  resolveTenantMonthlyPrice,
  type RenewalDiscountType,
} from '../domain/subscription-pricing';
import {
  computeRenewalPeriodEnd,
  lastInclusiveAccessDay,
  startOfDayInTimeZone,
} from '../domain/subscription-period';
import { getAccessPeriodEnd } from '../domain/subscription-access';

export type AdminRenewInput = {
  durationMonths: number;
  customDays?: number;
  discountType?: RenewalDiscountType | null;
  discountValue?: number | null;
  overrideFinalAmount?: number | null;
  finalAmount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  note?: string;
  sendInvoice?: boolean;
  idempotencyKey?: string;
  createdById: string;
};

function decimalToNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

export class SubscriptionRenewalService {
  async getTenantMonthlyPrice(businessId: string): Promise<number> {
    const [business, settings] = await Promise.all([
      prisma.business.findUnique({ where: { id: businessId } }),
      billingSettingsRepository.getOrCreate(),
    ]);
    if (!business) throw new BusinessNotFoundError();
    return resolveTenantMonthlyPrice(
      decimalToNumber(settings.monthlyPrice),
      business.customMonthlyPrice ? decimalToNumber(business.customMonthlyPrice) : null,
    );
  }

  computePeriodStart(
    business: {
      subscriptionEndsAt: Date | null;
      trialEndsAt: Date | null;
      subscriptionStatus: import('@prisma/client').SubscriptionStatus;
    },
    now: Date,
    tempAccessStartedAt?: Date | null,
  ): Date {
    const periodEnd = getAccessPeriodEnd(business, now);
    const candidates = [startOfDayInTimeZone(now)];
    if (periodEnd) {
      candidates.push(startOfDayInTimeZone(periodEnd));
    }
    if (tempAccessStartedAt) {
      candidates.push(startOfDayInTimeZone(tempAccessStartedAt));
    }
    return new Date(Math.max(...candidates.map((d) => d.getTime())));
  }

  async applyRenewal(
    businessId: string,
    input: {
      durationMonths: number;
      customDays?: number;
      pricing: ReturnType<typeof calculateRenewalPricing>;
      currency: string;
      paymentMethod?: string;
      paymentReference?: string;
      note?: string;
      source: 'ADMIN' | 'TENANT_SUBMISSION';
      createdById?: string;
      paymentSubmissionId?: string;
      idempotencyKey?: string;
      sendInvoice?: boolean;
      tempAccessStartedAt?: Date | null;
    },
  ) {
    if (input.idempotencyKey) {
      const existing = await prisma.subscriptionRenewal.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        const business = await prisma.business.findUnique({ where: { id: businessId } });
        return { renewal: existing, business, duplicate: true };
      }
    }

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new BusinessNotFoundError();

    const now = new Date();
    const periodStart = input.customDays
      ? startOfDayInTimeZone(now)
      : this.computePeriodStart(business, now, input.tempAccessStartedAt);

    const periodEndsAt = input.customDays
      ? new Date(periodStart.getTime() + input.customDays * 86400000)
      : computeRenewalPeriodEnd(periodStart, input.durationMonths);

    const billingInterval = input.durationMonths >= 12 ? 'YEARLY' : 'MONTHLY';

    const result = await prisma.$transaction(async (tx) => {
      const renewal = await tx.subscriptionRenewal.create({
        data: {
          businessId,
          source: input.source,
          paymentSubmissionId: input.paymentSubmissionId ?? null,
          durationMonths: input.customDays ? 0 : input.durationMonths,
          periodStartsAt: periodStart,
          periodEndsAt,
          baseAmount: input.pricing.baseAmount,
          discountType: input.pricing.discountType,
          discountValue: input.pricing.discountValue,
          overrideAmount: input.pricing.overrideAmount,
          finalAmount: input.pricing.finalAmount,
          currency: input.currency,
          paymentMethod: input.paymentMethod ?? null,
          paymentReference: input.paymentReference ?? null,
          note: input.note ?? null,
          createdById: input.createdById ?? null,
          idempotencyKey: input.idempotencyKey ?? null,
        },
      });

      const updatedBusiness = await tx.business.update({
        where: { id: businessId },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionEndsAt: periodEndsAt,
          trialEndsAt: null,
          billingInterval,
          isSubscriptionBlocked: false,
          subscriptionTempAccessUntil: null,
          subscriptionTempAccessForPeriodEnd: null,
        },
      });

      return { renewal, business: updatedBusiness };
    });

    return {
      ...result,
      duplicate: false,
      periodLabel: {
        startsAt: periodStart.toISOString(),
        endsAt: periodEndsAt.toISOString(),
        endsInclusive: lastInclusiveAccessDay(periodEndsAt).toISOString(),
      },
    };
  }

  async adminRenew(businessId: string, input: AdminRenewInput) {
    const settings = await billingSettingsRepository.getOrCreate();
    const monthlyPrice = await this.getTenantMonthlyPrice(businessId);

    const pricing = calculateRenewalPricing({
      monthlyPrice,
      durationMonths: input.durationMonths,
      discountType: input.discountType,
      discountValue: input.discountValue,
      overrideFinalAmount: input.overrideFinalAmount,
    });

    if (input.finalAmount != null && Math.abs(input.finalAmount - pricing.finalAmount) > 0.01) {
      throw new Error('Final amount mismatch');
    }

    return this.applyRenewal(businessId, {
      durationMonths: input.durationMonths,
      customDays: input.customDays,
      pricing,
      currency: settings.currency,
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference,
      note: input.note,
      source: 'ADMIN',
      createdById: input.createdById,
      idempotencyKey: input.idempotencyKey,
      sendInvoice: input.sendInvoice,
    });
  }
}

export const subscriptionRenewalService = new SubscriptionRenewalService();
