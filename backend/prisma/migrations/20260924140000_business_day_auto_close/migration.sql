ALTER TABLE "businesses"
ADD COLUMN "business_day_auto_close_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "business_day_close_reminder_enabled" BOOLEAN NOT NULL DEFAULT true;
