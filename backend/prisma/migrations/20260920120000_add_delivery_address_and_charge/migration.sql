-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "default_delivery_charge" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "customer_profiles" ADD COLUMN "delivery_address" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "delivery_amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
