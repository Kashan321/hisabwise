-- Temporary free-text order taker (when not linked to staff user)
ALTER TABLE "orders" ADD COLUMN "custom_waiter_name" VARCHAR(120);
