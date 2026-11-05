ALTER TABLE "orders" ADD COLUMN "idempotency_key" UUID;

CREATE UNIQUE INDEX "orders_business_id_idempotency_key_key" ON "orders"("business_id", "idempotency_key");
