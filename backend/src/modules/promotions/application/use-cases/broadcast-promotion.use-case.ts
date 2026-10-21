import { prisma } from '../../../../shared/database/prisma-client';
import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { PromotionNotFoundError } from '../../domain/errors/promotion.errors';

export class BroadcastPromotionUseCase {
  constructor(private readonly promotionRepository: PromotionRepository) {}

  async execute(businessId: string, promotionId: string) {
    const promotion = await this.promotionRepository.findById(businessId, promotionId);
    if (!promotion) throw new PromotionNotFoundError();

    const customers = await prisma.customerProfile.findMany({
      where: {
        businessId,
        OR: [{ email: { not: null } }, { phoneNumber: { not: null } }],
      },
    });

    const logs = customers.flatMap((customer) => {
      const entries = [];
      if (customer.email) {
        entries.push({
          businessId,
          channel: 'EMAIL' as const,
          recipient: customer.email,
          template: 'promotion_broadcast',
          payload: { promotionId, title: promotion.title },
        });
      }
      if (customer.phoneNumber) {
        entries.push({
          businessId,
          channel: 'SMS' as const,
          recipient: customer.phoneNumber,
          template: 'promotion_broadcast',
          payload: { promotionId, title: promotion.title },
        });
      }
      return entries;
    });

    if (logs.length) {
      await prisma.notificationLog.createMany({ data: logs });
      await prisma.notificationLog.updateMany({
        where: { businessId, status: 'PENDING', template: 'promotion_broadcast' },
        data: { status: 'SENT', sentAt: new Date() },
      });
    }

    emitDomainEvent('promotion.broadcast', { promotionId, businessId });

    return { recipients: logs.length, promotion };
  }
}
