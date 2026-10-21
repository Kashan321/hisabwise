-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PaymentSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "billing_interval" "BillingInterval",
ADD COLUMN     "subscription_ends_at" TIMESTAMP(3),
ADD COLUMN     "trial_ends_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "platform_billing_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "default_trial_days" INTEGER NOT NULL DEFAULT 14,
    "monthly_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "yearly_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "bank_name" TEXT,
    "account_title" TEXT,
    "account_number" TEXT,
    "iban" TEXT,
    "swift_code" TEXT,
    "payment_instructions" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_billing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_submissions" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "proof_image_url" TEXT NOT NULL,
    "status" "PaymentSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" TEXT,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_submissions_business_id_idx" ON "payment_submissions"("business_id");

-- CreateIndex
CREATE INDEX "payment_submissions_status_idx" ON "payment_submissions"("status");

-- AddForeignKey
ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_submissions" ADD CONSTRAINT "payment_submissions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
