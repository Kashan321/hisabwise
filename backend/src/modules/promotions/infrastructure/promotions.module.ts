import { CreatePromotionUseCase } from '../application/use-cases/create-promotion.use-case';
import { ListPromotionsUseCase } from '../application/use-cases/list-promotions.use-case';
import { GetPromotionUseCase } from '../application/use-cases/get-promotion.use-case';
import { UpdatePromotionUseCase } from '../application/use-cases/update-promotion.use-case';
import { SetPromotionActiveUseCase } from '../application/use-cases/set-promotion-active.use-case';
import { BroadcastPromotionUseCase } from '../application/use-cases/broadcast-promotion.use-case';
import { PrismaPromotionRepository } from './persistence/prisma-promotion.repository';

const promotionRepository = new PrismaPromotionRepository();

export const promotionsModule = {
  createPromotion: new CreatePromotionUseCase(promotionRepository),
  listPromotions: new ListPromotionsUseCase(promotionRepository),
  getPromotion: new GetPromotionUseCase(promotionRepository),
  updatePromotion: new UpdatePromotionUseCase(promotionRepository),
  setPromotionActive: new SetPromotionActiveUseCase(promotionRepository),
  broadcastPromotion: new BroadcastPromotionUseCase(promotionRepository),
};
