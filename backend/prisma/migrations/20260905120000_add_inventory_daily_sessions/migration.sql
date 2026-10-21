-- CreateEnum
CREATE TYPE "InventoryDailySessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "InventoryWastageReason" AS ENUM ('SPOILED', 'DAMAGED', 'EXPIRED', 'PREPARATION_WASTE', 'OTHER');

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN "daily_session_id" UUID,
ADD COLUMN "wastage_reason" "InventoryWastageReason",
ADD COLUMN "unit_cost" DECIMAL(14,4);

-- CreateTable
CREATE TABLE "inventory_daily_sessions" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "session_date" DATE NOT NULL,
    "shift_name" TEXT,
    "status" "InventoryDailySessionStatus" NOT NULL DEFAULT 'OPEN',
    "opened_by_id" UUID NOT NULL,
    "closed_by_id" UUID,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "opening_notes" TEXT,
    "closing_notes" TEXT,

    CONSTRAINT "inventory_daily_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_daily_lines" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "opening_quantity" DECIMAL(14,4) NOT NULL,
    "expected_closing_quantity" DECIMAL(14,4),
    "actual_closing_quantity" DECIMAL(14,4),
    "variance" DECIMAL(14,4),

    CONSTRAINT "inventory_daily_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_purchases" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "movement_id" UUID NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit_cost" DECIMAL(14,4),
    "total_cost" DECIMAL(14,4),
    "supplier" TEXT,
    "invoice_ref" TEXT,
    "notes" TEXT,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "inventory_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_movements_daily_session_id_inventory_item_id_idx" ON "inventory_movements"("daily_session_id", "inventory_item_id");

-- CreateIndex
CREATE INDEX "inventory_daily_sessions_business_id_status_idx" ON "inventory_daily_sessions"("business_id", "status");

-- CreateIndex
CREATE INDEX "inventory_daily_sessions_business_id_session_date_idx" ON "inventory_daily_sessions"("business_id", "session_date");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_daily_lines_session_id_inventory_item_id_key" ON "inventory_daily_lines"("session_id", "inventory_item_id");

-- CreateIndex
CREATE INDEX "inventory_daily_lines_inventory_item_id_idx" ON "inventory_daily_lines"("inventory_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_purchases_movement_id_key" ON "inventory_purchases"("movement_id");

-- CreateIndex
CREATE INDEX "inventory_purchases_session_id_idx" ON "inventory_purchases"("session_id");

-- CreateIndex
CREATE INDEX "inventory_purchases_business_id_purchased_at_idx" ON "inventory_purchases"("business_id", "purchased_at");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_daily_session_id_fkey" FOREIGN KEY ("daily_session_id") REFERENCES "inventory_daily_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_daily_sessions" ADD CONSTRAINT "inventory_daily_sessions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_daily_sessions" ADD CONSTRAINT "inventory_daily_sessions_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_daily_sessions" ADD CONSTRAINT "inventory_daily_sessions_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_daily_lines" ADD CONSTRAINT "inventory_daily_lines_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "inventory_daily_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_daily_lines" ADD CONSTRAINT "inventory_daily_lines_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_purchases" ADD CONSTRAINT "inventory_purchases_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_purchases" ADD CONSTRAINT "inventory_purchases_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "inventory_daily_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_purchases" ADD CONSTRAINT "inventory_purchases_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_purchases" ADD CONSTRAINT "inventory_purchases_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "inventory_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_purchases" ADD CONSTRAINT "inventory_purchases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
