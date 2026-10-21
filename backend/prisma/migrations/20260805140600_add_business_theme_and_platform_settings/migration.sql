-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "secondary_color" TEXT,
ADD COLUMN "background_color" TEXT,
ADD COLUMN "text_color" TEXT;

-- Backfill existing businesses with Venta default theme
UPDATE "businesses"
SET
  "primary_color" = COALESCE("primary_color", '#62B4A7'),
  "secondary_color" = COALESCE("secondary_color", '#4A9A8E'),
  "background_color" = COALESCE("background_color", '#F9F9F8'),
  "text_color" = COALESCE("text_color", '#1A1C1C');

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "primary_color" TEXT NOT NULL DEFAULT '#62B4A7',
    "secondary_color" TEXT NOT NULL DEFAULT '#4A9A8E',
    "background_color" TEXT NOT NULL DEFAULT '#F9F9F8',
    "text_color" TEXT NOT NULL DEFAULT '#1A1C1C',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "platform_settings" ("id", "primary_color", "secondary_color", "background_color", "text_color", "updated_at")
VALUES ('default', '#62B4A7', '#4A9A8E', '#F9F9F8', '#1A1C1C', CURRENT_TIMESTAMP);
