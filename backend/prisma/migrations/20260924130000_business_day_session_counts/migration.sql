-- Track how many times a business day was opened/closed on the same date
ALTER TABLE "business_days" ADD COLUMN "open_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "business_days" ADD COLUMN "close_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "business_days" ADD COLUMN "last_opened_at" TIMESTAMP(3);

UPDATE "business_days"
SET "last_opened_at" = "started_at"
WHERE "last_opened_at" IS NULL;

ALTER TABLE "business_days" ALTER COLUMN "last_opened_at" SET NOT NULL;

UPDATE "business_days"
SET "close_count" = 1
WHERE "status" = 'CLOSED';
