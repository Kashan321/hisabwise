import { prisma } from '../../../../shared/database/prisma-client';
import { BusinessEntity, UpdateBusinessInput } from '../../domain/entities/business.entity';
import { BusinessRepository } from '../../domain/repositories/business.repository';
import { filesModule } from '../../../files/infrastructure/files.module';

function mapBusiness(business: {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  city: string | null;
  branchNumber: string | null;
  phone: string | null;
  phoneSecondary: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  currency: string | null;
  subscriptionStatus: string;
  allowNegativeInventory: boolean;
  orderTicketPrefix: string;
  orderTicketResetDaily: boolean;
  businessDayStartTime: string;
  businessDayTimezone: string;
  businessDayAutoCloseEnabled: boolean;
  businessDayCloseReminderEnabled: boolean;
  defaultTaxRate: { toString(): string };
  defaultDeliveryCharge: { toString(): string };
  createdAt: Date;
}): BusinessEntity {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    location: business.location,
    city: business.city,
    branchNumber: business.branchNumber,
    phone: business.phone,
    phoneSecondary: business.phoneSecondary,
    logoUrl: business.logoUrl,
    primaryColor: business.primaryColor,
    secondaryColor: business.secondaryColor,
    backgroundColor: business.backgroundColor,
    textColor: business.textColor,
    currency: business.currency,
    subscriptionStatus: business.subscriptionStatus,
    allowNegativeInventory: business.allowNegativeInventory,
    orderTicketPrefix: business.orderTicketPrefix,
    orderTicketResetDaily: business.orderTicketResetDaily,
    businessDayStartTime: business.businessDayStartTime,
    businessDayTimezone: business.businessDayTimezone,
    businessDayAutoCloseEnabled: business.businessDayAutoCloseEnabled,
    businessDayCloseReminderEnabled: business.businessDayCloseReminderEnabled,
    defaultTaxRate: Number(business.defaultTaxRate),
    defaultDeliveryCharge: Number(business.defaultDeliveryCharge),
    createdAt: business.createdAt,
  };
}

const storageUrlResolver = filesModule.storageUrlResolver;

async function mapBusinessResolved(
  business: Parameters<typeof mapBusiness>[0],
): Promise<BusinessEntity> {
  return storageUrlResolver.resolveBusiness(mapBusiness(business));
}

export class PrismaTenantBusinessRepository implements BusinessRepository {
  async findById(id: string): Promise<BusinessEntity | null> {
    const business = await prisma.business.findUnique({ where: { id } });
    return business ? await mapBusinessResolved(business) : null;
  }

  async update(id: string, input: UpdateBusinessInput): Promise<BusinessEntity> {
    const data: UpdateBusinessInput = { ...input };
    if (data.logoUrl) {
      data.logoUrl = storageUrlResolver.normalizeKey(data.logoUrl);
    }

    const business = await prisma.business.update({
      where: { id },
      data,
    });
    return await mapBusinessResolved(business);
  }
}
