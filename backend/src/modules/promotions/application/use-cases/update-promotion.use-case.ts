import { UpdatePromotionInput } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { PromotionNotFoundError } from '../../domain/errors/promotion.errors';

export class UpdatePromotionUseCase {
  constructor(private readonly promotionRepository: PromotionRepository) {}

  async execute(businessId: string, promotionId: string, input: UpdatePromotionInput) {
    const existing = await this.promotionRepository.findById(businessId, promotionId);
    if (!existing) throw new PromotionNotFoundError();
    return this.promotionRepository.update(businessId, promotionId, input);
  }
}
