import { emitDomainEvent } from '../../../../shared/events/event-bus';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { PromotionNotFoundError } from '../../domain/errors/promotion.errors';

export class SetPromotionActiveUseCase {
  constructor(private readonly promotionRepository: PromotionRepository) {}

  async execute(businessId: string, promotionId: string, isActive: boolean) {
    const existing = await this.promotionRepository.findById(businessId, promotionId);
    if (!existing) throw new PromotionNotFoundError();

    const promotion = await this.promotionRepository.setActive(businessId, promotionId, isActive);

    if (isActive) {
      emitDomainEvent('promotion.activated', { promotionId, businessId });
    }

    return promotion;
  }
}
