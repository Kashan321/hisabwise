-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN "receipt_template" JSONB;

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "receipt_template_override" JSONB;
