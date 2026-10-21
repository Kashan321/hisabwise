import { Prisma } from '@prisma/client';
import { prisma } from '../../../../shared/database/prisma-client';
import {
  CreatePromotionInput,
  PromotionEntity,
  UpdatePromotionInput,
} from '../../domain/entities/promotion.entity';
import { PromotionRepository } from '../../domain/repositories/promotion.repository';
import { PromotionNotFoundError } from '../../domain/errors/promotion.errors';

function decimalToString(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

function mapPromotion(promotion: {
  id: string;
  businessId: string;
  title: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: Prisma.Decimal;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PromotionEntity {
  return {
    ...promotion,
    discountValue: decimalToString(promotion.discountValue),
  };
}

export class PrismaPromotionRepository implements PromotionRepository {
  async findAll(businessId: string, activeOnly = false): Promise<PromotionEntity[]> {
    const promotions = await prisma.promotion.findMany({
      where: {
        businessId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { startDate: 'desc' },
    });
    return promotions.map(mapPromotion);
  }

  async findById(businessId: string, promotionId: string): Promise<PromotionEntity | null> {
    const promotion = await prisma.promotion.findFirst({
      where: { id: promotionId, businessId },
    });
    return promotion ? mapPromotion(promotion) : null;
  }

  async create(businessId: string, input: CreatePromotionInput): Promise<PromotionEntity> {
    const promotion = await prisma.promotion.create({
      data: {
        businessId,
        title: input.title,
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });
    return mapPromotion(promotion);
  }

  async update(
    businessId: string,
    promotionId: string,
    input: UpdatePromotionInput,
  ): Promise<PromotionEntity> {
    const existing = await prisma.promotion.findFirst({ where: { id: promotionId, businessId } });
    if (!existing) throw new PromotionNotFoundError();

    const promotion = await prisma.promotion.update({
      where: { id: promotionId },
      data: input,
    });
    return mapPromotion(promotion);
  }

  async setActive(
    businessId: string,
    promotionId: string,
    isActive: boolean,
  ): Promise<PromotionEntity> {
    const existing = await prisma.promotion.findFirst({ where: { id: promotionId, businessId } });
    if (!existing) throw new PromotionNotFoundError();

    const promotion = await prisma.promotion.update({
      where: { id: promotionId },
      data: { isActive },
    });
    return mapPromotion(promotion);
  }
}
