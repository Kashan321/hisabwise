-- CreateEnum
CREATE TYPE "RiderCashSettlementStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateTable
CREATE TABLE "rider_cash_settlements" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "rider_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "RiderCashSettlementStatus" NOT NULL DEFAULT 'PENDING',
    "cash_shift_id" UUID,
    "confirmed_by_id" UUID,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rider_cash_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rider_cash_settlements_order_id_key" ON "rider_cash_settlements"("order_id");

-- CreateIndex
CREATE INDEX "rider_cash_settlements_business_id_status_created_at_idx" ON "rider_cash_settlements"("business_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "rider_cash_settlements_business_id_rider_id_status_idx" ON "rider_cash_settlements"("business_id", "rider_id", "status");

-- AddForeignKey
ALTER TABLE "rider_cash_settlements" ADD CONSTRAINT "rider_cash_settlements_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_cash_settlements" ADD CONSTRAINT "rider_cash_settlements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_cash_settlements" ADD CONSTRAINT "rider_cash_settlements_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_cash_settlements" ADD CONSTRAINT "rider_cash_settlements_cash_shift_id_fkey" FOREIGN KEY ("cash_shift_id") REFERENCES "cash_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_cash_settlements" ADD CONSTRAINT "rider_cash_settlements_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
