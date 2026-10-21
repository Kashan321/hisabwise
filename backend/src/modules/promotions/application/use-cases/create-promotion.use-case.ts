import { CreatePromotionInput } from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';

export class CreatePromotionUseCase {
  constructor(private readonly promotionRepository: PromotionRepository) {}

  execute(businessId: string, input: CreatePromotionInput) {
    return this.promotionRepository.create(businessId, input);
  }
}
