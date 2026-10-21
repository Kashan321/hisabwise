-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'ONLINE', 'OTHER');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "payment_method" "PaymentMethod";
