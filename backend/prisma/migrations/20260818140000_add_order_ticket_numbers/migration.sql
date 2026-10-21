-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "order_ticket_prefix" TEXT NOT NULL DEFAULT 'TKT';
ALTER TABLE "businesses" ADD COLUMN "order_ticket_reset_daily" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "businesses" ADD COLUMN "next_order_ticket_number" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "businesses" ADD COLUMN "order_ticket_day_key" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "ticket_number" INTEGER;
ALTER TABLE "orders" ADD COLUMN "ticket_prefix" TEXT;

-- CreateIndex
CREATE INDEX "orders_business_id_ticket_number_idx" ON "orders"("business_id", "ticket_number");
