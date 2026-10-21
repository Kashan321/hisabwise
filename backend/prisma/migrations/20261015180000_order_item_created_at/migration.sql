-- Line-item timestamp for detecting add-ons vs original punch.
ALTER TABLE "order_items" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "order_items" AS oi
SET "created_at" = o."created_at"
FROM "orders" AS o
WHERE o."id" = oi."order_id";

-- Legacy punched orders never stored kitchen send time; use order created_at as baseline.
UPDATE "orders"
SET "sent_to_kitchen_at" = "created_at"
WHERE "is_draft" = false
  AND "sent_to_kitchen_at" IS NULL;
