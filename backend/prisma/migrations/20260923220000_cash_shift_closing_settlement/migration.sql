-- CreateEnum
CREATE TYPE "CashClosingSettlementType" AS ENUM ('KEEP_IN_DRAWER', 'HANDOVER_TO_OWNER', 'TRANSFER_TO_WALLET', 'TRANSFER_TO_BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "CashSettlementAccountType" AS ENUM ('DRAWER', 'OWNER', 'WALLET', 'BANK', 'OTHER');

-- CreateTable
CREATE TABLE "cash_settlement_accounts" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "account_type" "CashSettlementAccountType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_settlement_accounts_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "cash_shifts" ADD COLUMN "closing_settlement" "CashClosingSettlementType",
ADD COLUMN "transferred_cash" DECIMAL(10,2),
ADD COLUMN "destination_account_id" UUID;

-- CreateIndex
CREATE INDEX "cash_settlement_accounts_business_id_idx" ON "cash_settlement_accounts"("business_id");

-- AddForeignKey
ALTER TABLE "cash_settlement_accounts" ADD CONSTRAINT "cash_settlement_accounts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_destination_account_id_fkey" FOREIGN KEY ("destination_account_id") REFERENCES "cash_settlement_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
