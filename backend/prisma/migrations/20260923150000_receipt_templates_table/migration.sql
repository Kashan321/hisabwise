-- CreateTable
CREATE TABLE "receipt_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_templates_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "receipt_template_id" UUID;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_receipt_template_id_fkey" FOREIGN KEY ("receipt_template_id") REFERENCES "receipt_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop legacy single-template column
ALTER TABLE "platform_settings" DROP COLUMN IF EXISTS "receipt_template";
