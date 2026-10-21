import { PromotionRepository } from '../../domain/repositories/promotion.repository';

export class ListPromotionsUseCase {
  constructor(private readonly promotionRepository: PromotionRepository) {}

  execute(businessId: string, activeOnly?: boolean) {
    return this.promotionRepository.findAll(businessId, activeOnly);
  }
}
