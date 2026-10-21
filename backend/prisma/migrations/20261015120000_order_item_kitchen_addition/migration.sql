-- Mark line items created via add-items (after initial order / kitchen send).
ALTER TABLE "order_items" ADD COLUMN "is_kitchen_addition" BOOLEAN NOT NULL DEFAULT false;

UPDATE "order_items" AS oi
SET "is_kitchen_addition" = true
FROM "kitchen_tickets" AS kt
WHERE oi."kitchen_ticket_id" = kt."id"
  AND kt."batch_number" > 1;
