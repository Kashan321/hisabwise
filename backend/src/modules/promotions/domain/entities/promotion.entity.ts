export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface PromotionEntity {
  id: string;
  businessId: string;
  title: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePromotionInput {
  title: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: Date;
  endDate: Date;
}

export interface UpdatePromotionInput {
  title?: string;
  description?: string | null;
  discountType?: DiscountType;
  discountValue?: number;
  startDate?: Date;
  endDate?: Date;
}
