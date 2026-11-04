-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "welcome_email_sent_at" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "EmailVerificationPurpose" AS ENUM ('REGISTER');

-- CreateTable
CREATE TABLE "email_verification_codes" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "EmailVerificationPurpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_verification_codes_email_purpose_created_at_idx" ON "email_verification_codes"("email", "purpose", "created_at");
