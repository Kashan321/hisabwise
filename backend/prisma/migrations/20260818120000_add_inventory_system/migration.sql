-- CreateEnum
CREATE TYPE "InventoryUnit" AS ENUM ('KG', 'G', 'LITER', 'ML', 'PIECE', 'PACK', 'BOTTLE');

-- CreateEnum
CREATE TYPE "InventoryTrackingMode" AS ENUM ('NONE', 'SIMPLE_STOCK', 'RECIPE');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('SALE', 'SALE_REVERSAL', 'ADJUSTMENT', 'RECEIPT', 'WASTE', 'INITIAL');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "allow_negative_inventory" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN "inventory_tracking_mode" "InventoryTrackingMode" NOT NULL DEFAULT 'NONE';
ALTER TABLE "menu_items" ADD COLUMN "inventory_item_id" UUID;

-- AlterTable
ALTER TABLE "menu_item_variants" ADD COLUMN "inventory_tracking_mode" "InventoryTrackingMode" NOT NULL DEFAULT 'NONE';
ALTER TABLE "menu_item_variants" ADD COLUMN "inventory_item_id" UUID;

-- AlterTable
ALTER TABLE "modifier_options" ADD COLUMN "inventory_tracking_mode" "InventoryTrackingMode" NOT NULL DEFAULT 'NONE';
ALTER TABLE "modifier_options" ADD COLUMN "inventory_item_id" UUID;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "inventory_deducted_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "inventory_reversed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    "current_quantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "min_threshold" DECIMAL(14,4),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_recipes" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "menu_item_id" UUID,
    "menu_item_variant_id" UUID,
    "modifier_option_id" UUID,

    CONSTRAINT "inventory_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_recipe_lines" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" "InventoryUnit" NOT NULL,

    CONSTRAINT "inventory_recipe_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity_delta" DECIMAL(14,4) NOT NULL,
    "quantity_after" DECIMAL(14,4) NOT NULL,
    "order_id" UUID,
    "order_item_id" UUID,
    "note" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_business_id_name_key" ON "inventory_items"("business_id", "name");

-- CreateIndex
CREATE INDEX "inventory_items_business_id_is_active_idx" ON "inventory_items"("business_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_recipes_menu_item_id_key" ON "inventory_recipes"("menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_recipes_menu_item_variant_id_key" ON "inventory_recipes"("menu_item_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_recipes_modifier_option_id_key" ON "inventory_recipes"("modifier_option_id");

-- CreateIndex
CREATE INDEX "inventory_recipes_business_id_idx" ON "inventory_recipes"("business_id");

-- CreateIndex
CREATE INDEX "inventory_recipe_lines_recipe_id_idx" ON "inventory_recipe_lines"("recipe_id");

-- CreateIndex
CREATE INDEX "inventory_recipe_lines_inventory_item_id_idx" ON "inventory_recipe_lines"("inventory_item_id");

-- CreateIndex
CREATE INDEX "inventory_movements_business_id_inventory_item_id_created_at_idx" ON "inventory_movements"("business_id", "inventory_item_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_movements_business_id_order_id_idx" ON "inventory_movements"("business_id", "order_id");

-- CreateIndex
CREATE INDEX "menu_items_inventory_item_id_idx" ON "menu_items"("inventory_item_id");

-- CreateIndex
CREATE INDEX "menu_item_variants_inventory_item_id_idx" ON "menu_item_variants"("inventory_item_id");

-- CreateIndex
CREATE INDEX "modifier_options_inventory_item_id_idx" ON "modifier_options"("inventory_item_id");

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_recipes" ADD CONSTRAINT "inventory_recipes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_recipes" ADD CONSTRAINT "inventory_recipes_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_recipes" ADD CONSTRAINT "inventory_recipes_menu_item_variant_id_fkey" FOREIGN KEY ("menu_item_variant_id") REFERENCES "menu_item_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_recipes" ADD CONSTRAINT "inventory_recipes_modifier_option_id_fkey" FOREIGN KEY ("modifier_option_id") REFERENCES "modifier_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_recipe_lines" ADD CONSTRAINT "inventory_recipe_lines_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "inventory_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_recipe_lines" ADD CONSTRAINT "inventory_recipe_lines_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
