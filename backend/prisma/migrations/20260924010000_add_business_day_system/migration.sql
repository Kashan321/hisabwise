-- CreateEnum
CREATE TYPE "BusinessDayStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable: business config
ALTER TABLE "businesses" ADD COLUMN "business_day_start_time" TEXT NOT NULL DEFAULT '05:00';
ALTER TABLE "businesses" ADD COLUMN "business_day_timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi';

-- CreateTable
CREATE TABLE "business_days" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "business_date" DATE NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "status" "BusinessDayStatus" NOT NULL DEFAULT 'OPEN',
    "last_order_sequence" INTEGER NOT NULL DEFAULT 0,
    "opened_by_id" UUID NOT NULL,
    "closed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_days_pkey" PRIMARY KEY ("id")
);

-- AlterTable: orders
ALTER TABLE "orders" ADD COLUMN "business_day_id" UUID;

-- AlterTable: cash_shifts
ALTER TABLE "cash_shifts" ADD COLUMN "business_day_id" UUID;

-- AlterTable: inventory
ALTER TABLE "inventory_movements" ADD COLUMN "business_day_id" UUID;
ALTER TABLE "inventory_purchases" ADD COLUMN "business_day_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "business_days_business_id_business_date_key" ON "business_days"("business_id", "business_date");
CREATE INDEX "business_days_business_id_status_idx" ON "business_days"("business_id", "status");
CREATE INDEX "orders_business_id_business_day_id_idx" ON "orders"("business_id", "business_day_id");
CREATE UNIQUE INDEX "orders_business_day_id_ticket_number_key" ON "orders"("business_day_id", "ticket_number");
CREATE INDEX "cash_shifts_business_day_id_idx" ON "cash_shifts"("business_day_id");
CREATE INDEX "inventory_movements_business_id_business_day_id_idx" ON "inventory_movements"("business_id", "business_day_id");
CREATE INDEX "inventory_purchases_business_id_business_day_id_idx" ON "inventory_purchases"("business_id", "business_day_id");

-- AddForeignKey
ALTER TABLE "business_days" ADD CONSTRAINT "business_days_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_days" ADD CONSTRAINT "business_days_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "business_days" ADD CONSTRAINT "business_days_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_day_id_fkey" FOREIGN KEY ("business_day_id") REFERENCES "business_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_business_day_id_fkey" FOREIGN KEY ("business_day_id") REFERENCES "business_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_business_day_id_fkey" FOREIGN KEY ("business_day_id") REFERENCES "business_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_purchases" ADD CONSTRAINT "inventory_purchases_business_day_id_fkey" FOREIGN KEY ("business_day_id") REFERENCES "business_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;
