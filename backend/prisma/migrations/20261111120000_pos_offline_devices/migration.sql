-- CreateTable
CREATE TABLE "pos_devices" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "device_key" UUID NOT NULL,
    "ticket_prefix" VARCHAR(3) NOT NULL,
    "next_offline_ticket_number" INTEGER NOT NULL DEFAULT 1,
    "label" VARCHAR(120),
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_devices_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "pos_device_id" UUID,
ADD COLUMN "offline_ticket_label" VARCHAR(32),
ADD COLUMN "sync_conflict_flags" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "pos_devices_business_id_device_key_key" ON "pos_devices"("business_id", "device_key");

-- CreateIndex
CREATE INDEX "pos_devices_business_id_idx" ON "pos_devices"("business_id");

-- AddForeignKey
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_pos_device_id_fkey" FOREIGN KEY ("pos_device_id") REFERENCES "pos_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Platform settings defaults (new rows only; conditional update for factory theme)
ALTER TABLE "platform_settings" ALTER COLUMN "primary_color" SET DEFAULT '#212121';
ALTER TABLE "platform_settings" ALTER COLUMN "secondary_color" SET DEFAULT '#3B4554';
ALTER TABLE "platform_settings" ALTER COLUMN "background_color" SET DEFAULT '#FFFFFF';
ALTER TABLE "platform_settings" ALTER COLUMN "text_color" SET DEFAULT '#111827';

UPDATE "platform_settings"
SET
  "primary_color" = '#212121',
  "secondary_color" = '#3B4554',
  "background_color" = '#FFFFFF',
  "text_color" = '#111827'
WHERE
  "id" = 'default'
  AND "primary_color" = '#62B4A7'
  AND "secondary_color" = '#4A9A8E'
  AND "background_color" = '#F9F9F8'
  AND "text_color" = '#1A1C1C';
