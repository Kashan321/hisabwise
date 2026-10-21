import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { PromotionNotFoundError } from '../../domain/errors/promotion.errors';

export class GetPromotionUseCase {
  constructor(private readonly promotionRepository: PromotionRepository) {}

  async execute(businessId: string, promotionId: string) {
    const promotion = await this.promotionRepository.findById(businessId, promotionId);
    if (!promotion) throw new PromotionNotFoundError();
    return promotion;
  }
}
