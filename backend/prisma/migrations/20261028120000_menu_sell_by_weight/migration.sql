-- CreateEnum
CREATE TYPE "MenuPricingType" AS ENUM ('FIXED', 'BY_WEIGHT');

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "pricing_type" "MenuPricingType" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "price_per_kg" DECIMAL(12,2),
ADD COLUMN     "pricing_unit_g" INTEGER,
ADD COLUMN     "min_weight_g" INTEGER,
ADD COLUMN     "weight_step_g" INTEGER,
ADD COLUMN     "quick_weights_g" JSONB,
ADD COLUMN     "price_rounding" INTEGER;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "weight_g" INTEGER,
ADD COLUMN     "unit_price_per_kg" DECIMAL(12,2);
