import {
  CreatePromotionInput,
  PromotionEntity,
  UpdatePromotionInput,
} from '../entities/promotion.entity';

export interface PromotionRepository {
  findAll(businessId: string, activeOnly?: boolean): Promise<PromotionEntity[]>;
  findById(businessId: string, promotionId: string): Promise<PromotionEntity | null>;
  create(businessId: string, input: CreatePromotionInput): Promise<PromotionEntity>;
  update(
    businessId: string,
    promotionId: string,
    input: UpdatePromotionInput,
  ): Promise<PromotionEntity>;
  setActive(businessId: string, promotionId: string, isActive: boolean): Promise<PromotionEntity>;
}
