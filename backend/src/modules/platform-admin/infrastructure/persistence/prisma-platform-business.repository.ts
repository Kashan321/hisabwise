import { BillingInterval, SubscriptionStatus } from '@prisma/client';
import { addIntervalEnd } from '../../../billing/domain/subscription-access';
import { getRawPrismaClient } from '../../../../shared/database/prisma-client';
import {
  BusinessDetail,
  BusinessSummary,
  PlatformBusinessRepository,
  PlatformMetrics,
  PlatformMetricsRepository,
} from '../../domain/repositories/platform-business.repository';

function mapBusinessSummary(
  business: {
    id: string;
    name: string;
    slug: string;
    location: string | null;
    subscriptionStatus: SubscriptionStatus;
    isSuspended: boolean;
    isSubscriptionBlocked: boolean;
    trialEndsAt: Date | null;
    subscriptionEndsAt: Date | null;
    billingInterval: string | null;
    customMonthlyPrice: { toString(): string } | null;
    subscriptionTempAccessUntil: Date | null;
    createdAt: Date;
    _count: { users: number; orders: number };
    users: Array<{ email: string; name: string }>;
  },
): BusinessSummary {
  const owner = business.users[0];
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    location: business.location,
    subscriptionStatus: business.subscriptionStatus,
    isSuspended: business.isSuspended,
    isSubscriptionBlocked: business.isSubscriptionBlocked,
    trialEndsAt: business.trialEndsAt,
    subscriptionEndsAt: business.subscriptionEndsAt,
    billingInterval: business.billingInterval,
    customMonthlyPrice: business.customMonthlyPrice
      ? Number(business.customMonthlyPrice.toString())
      : null,
    subscriptionTempAccessUntil: business.subscriptionTempAccessUntil,
    createdAt: business.createdAt,
    userCount: business._count.users,
    orderCount: business._count.orders,
    ownerEmail: owner?.email ?? null,
    ownerName: owner?.name ?? null,
  };
}

const businessInclude = {
  _count: { select: { users: true, orders: true } },
  users: {
    where: {
      userRoles: {
        some: {
          role: { name: 'owner', isSystem: true },
        },
      },
    },
    select: { email: true, name: true },
    orderBy: { createdAt: 'asc' as const },
    take: 1,
  },
};

export class PrismaPlatformBusinessRepository implements PlatformBusinessRepository {
  private readonly prisma = getRawPrismaClient();

  async list(): Promise<BusinessSummary[]> {
    const businesses = await this.prisma.business.findMany({
      orderBy: { createdAt: 'desc' },
      include: businessInclude,
    });

    return businesses.map(mapBusinessSummary);
  }

  async findById(id: string): Promise<BusinessDetail | null> {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: businessInclude,
    });

    if (!business) {
      return null;
    }

    return {
      ...mapBusinessSummary(business),
      logoUrl: business.logoUrl,
      primaryColor: business.primaryColor,
      secondaryColor: business.secondaryColor,
      backgroundColor: business.backgroundColor,
      textColor: business.textColor,
    };
  }

  async updateSubscription(id: string, status: SubscriptionStatus): Promise<BusinessDetail> {
    const existing = await this.prisma.business.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Business not found');
    }

    const now = new Date();
    const data: {
      subscriptionStatus: SubscriptionStatus;
      isSubscriptionBlocked?: boolean;
      subscriptionEndsAt?: Date | null;
      trialEndsAt?: Date | null;
      billingInterval?: BillingInterval | null;
    } = {
      subscriptionStatus: status,
      ...(status === 'ACTIVE' || status === 'TRIAL' ? { isSubscriptionBlocked: false } : {}),
    };

    if (status === 'ACTIVE') {
      data.trialEndsAt = null;
      if (!existing.subscriptionEndsAt || existing.subscriptionEndsAt < now) {
        const interval = existing.billingInterval ?? 'MONTHLY';
        data.subscriptionEndsAt = addIntervalEnd(now, interval);
        if (!existing.billingInterval) {
          data.billingInterval = interval;
        }
      }
    }

    if (status === 'TRIAL' && existing.subscriptionStatus !== 'TRIAL') {
      data.subscriptionEndsAt = null;
      data.billingInterval = null;
    }

    const business = await this.prisma.business.update({
      where: { id },
      data,
      include: businessInclude,
    });

    return {
      ...mapBusinessSummary(business),
      logoUrl: business.logoUrl,
      primaryColor: business.primaryColor,
      secondaryColor: business.secondaryColor,
      backgroundColor: business.backgroundColor,
      textColor: business.textColor,
    };
  }

  async setSuspended(id: string, isSuspended: boolean): Promise<BusinessDetail> {
    const business = await this.prisma.business.update({
      where: { id },
      data: { isSuspended },
      include: businessInclude,
    });

    return {
      ...mapBusinessSummary(business),
      logoUrl: business.logoUrl,
      primaryColor: business.primaryColor,
      secondaryColor: business.secondaryColor,
      backgroundColor: business.backgroundColor,
      textColor: business.textColor,
    };
  }

  async updateCustomMonthlyPrice(
    id: string,
    customMonthlyPrice: number | null,
  ): Promise<BusinessDetail> {
    const business = await this.prisma.business.update({
      where: { id },
      data: {
        customMonthlyPrice: customMonthlyPrice != null ? customMonthlyPrice : null,
      },
      include: businessInclude,
    });

    return {
      ...mapBusinessSummary(business),
      logoUrl: business.logoUrl,
      primaryColor: business.primaryColor,
      secondaryColor: business.secondaryColor,
      backgroundColor: business.backgroundColor,
      textColor: business.textColor,
    };
  }

  async setSubscriptionBlocked(id: string, isSubscriptionBlocked: boolean): Promise<BusinessDetail> {
    const business = await this.prisma.business.update({
      where: { id },
      data: { isSubscriptionBlocked },
      include: businessInclude,
    });

    return {
      ...mapBusinessSummary(business),
      logoUrl: business.logoUrl,
      primaryColor: business.primaryColor,
      secondaryColor: business.secondaryColor,
      backgroundColor: business.backgroundColor,
      textColor: business.textColor,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Delete in dependency order — several child tables use ON DELETE RESTRICT
      // (daily sessions/purchases → users, order items → menu items, recipe lines → items).
      await tx.subscriptionInvoice.deleteMany({ where: { businessId: id } });
      await tx.supplierPayment.deleteMany({ where: { businessId: id } });
      await tx.inventoryPurchase.deleteMany({ where: { businessId: id } });
      await tx.supplier.deleteMany({ where: { businessId: id } });
      await tx.inventoryDailyLine.deleteMany({
        where: { session: { businessId: id } },
      });
      await tx.inventoryDailySession.deleteMany({ where: { businessId: id } });
      await tx.inventoryMovement.deleteMany({ where: { businessId: id } });
      await tx.inventoryRecipeLine.deleteMany({
        where: { recipe: { businessId: id } },
      });
      await tx.inventoryRecipe.deleteMany({ where: { businessId: id } });
      await tx.order.deleteMany({ where: { businessId: id } });
      await tx.business.delete({ where: { id } });
    });
  }
}

export class PrismaPlatformMetricsRepository implements PlatformMetricsRepository {
  private readonly prisma = getRawPrismaClient();

  async getMetrics(): Promise<PlatformMetrics> {
    const [
      totalBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      trialBusinesses,
      totalPlatformUsers,
      totalOrders,
      totalCustomers,
    ] = await Promise.all([
      this.prisma.business.count(),
      this.prisma.business.count({
        where: { isSuspended: false, subscriptionStatus: { in: ['ACTIVE', 'TRIAL'] } },
      }),
      this.prisma.business.count({ where: { isSuspended: true } }),
      this.prisma.business.count({ where: { subscriptionStatus: 'TRIAL' } }),
      this.prisma.platformUser.count({ where: { isActive: true } }),
      this.prisma.order.count(),
      this.prisma.customerProfile.count(),
    ]);

    return {
      totalBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      trialBusinesses,
      totalPlatformUsers,
      totalOrders,
      totalCustomers,
    };
  }
}
