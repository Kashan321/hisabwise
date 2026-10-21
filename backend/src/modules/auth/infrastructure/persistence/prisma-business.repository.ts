import { prisma } from '../../../../shared/database/prisma-client';
import {
  BusinessRepository,
  CreateBusinessProfile,
} from '../../domain/repositories/business.repository';
import { addDays } from '../../../billing/domain/subscription-access';
import { billingSettingsRepository } from '../../../billing/infrastructure/billing-settings.repository';
import { ticketPrefixFromSlug } from '../../../../shared/ticket/ticket-prefix';

export class PrismaBusinessRepository implements BusinessRepository {
  async create(
    name: string,
    slug: string,
    profile: CreateBusinessProfile,
    theme?: {
      primaryColor?: string;
      secondaryColor?: string;
      backgroundColor?: string;
      textColor?: string;
    },
  ) {
    const settings = await billingSettingsRepository.getOrCreate();
    const trialEndsAt = addDays(new Date(), settings.defaultTrialDays);
    return prisma.business.create({
      data: {
        name,
        slug,
        phone: profile.phone,
        city: profile.city,
        location: profile.location,
        branchNumber: profile.branchNumber,
        orderTicketPrefix: ticketPrefixFromSlug(slug),
        trialEndsAt,
        subscriptionStatus: 'TRIAL',
        primaryColor: theme?.primaryColor ?? null,
        secondaryColor: theme?.secondaryColor ?? null,
        backgroundColor: theme?.backgroundColor ?? null,
        textColor: theme?.textColor ?? null,
      },
      select: { id: true, name: true, slug: true },
    });
  }

  async slugExists(slug: string): Promise<boolean> {
    const business = await prisma.business.findUnique({ where: { slug } });
    return Boolean(business);
  }

  async isSuspended(businessId: string): Promise<boolean> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { isSuspended: true },
    });
    return business?.isSuspended ?? false;
  }

  async findSlugById(businessId: string): Promise<string | null> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { slug: true },
    });
    return business?.slug ?? null;
  }
}
