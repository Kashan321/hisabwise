-- CreateEnum
CREATE TYPE "KitchenTicketStatus" AS ENUM ('RECEIVED', 'PREPARING', 'READY', 'CLEARED');

-- CreateTable
CREATE TABLE "kitchen_tickets" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "batch_number" INTEGER NOT NULL,
    "status" "KitchenTicketStatus" NOT NULL DEFAULT 'RECEIVED',
    "prepared_by_id" UUID,
    "prepared_at" TIMESTAMP(3),
    "cleared_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_tickets_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "kitchen_ticket_id" UUID;

-- Backfill kitchen tickets for active kitchen orders
INSERT INTO "kitchen_tickets" ("id", "business_id", "order_id", "batch_number", "status", "prepared_by_id", "prepared_at", "created_at")
SELECT
    gen_random_uuid(),
    o."business_id",
    o."id",
    1,
    CASE o."status"
        WHEN 'RECEIVED' THEN 'RECEIVED'::"KitchenTicketStatus"
        WHEN 'PREPARING' THEN 'PREPARING'::"KitchenTicketStatus"
        WHEN 'READY' THEN 'READY'::"KitchenTicketStatus"
        ELSE 'CLEARED'::"KitchenTicketStatus"
    END,
    o."prepared_by_id",
    o."prepared_at",
    o."created_at"
FROM "orders" o
WHERE o."is_draft" = false
  AND o."status" IN ('RECEIVED', 'PREPARING', 'READY');

UPDATE "order_items" oi
SET "kitchen_ticket_id" = kt."id"
FROM "kitchen_tickets" kt
WHERE oi."order_id" = kt."order_id"
  AND kt."batch_number" = 1
  AND oi."kitchen_ticket_id" IS NULL;

-- CreateIndex
CREATE INDEX "kitchen_tickets_business_id_status_created_at_idx" ON "kitchen_tickets"("business_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_tickets_order_id_batch_number_key" ON "kitchen_tickets"("order_id", "batch_number");

-- CreateIndex
CREATE INDEX "order_items_kitchen_ticket_id_idx" ON "order_items"("kitchen_ticket_id");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_kitchen_ticket_id_fkey" FOREIGN KEY ("kitchen_ticket_id") REFERENCES "kitchen_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_tickets" ADD CONSTRAINT "kitchen_tickets_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_tickets" ADD CONSTRAINT "kitchen_tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_tickets" ADD CONSTRAINT "kitchen_tickets_prepared_by_id_fkey" FOREIGN KEY ("prepared_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
