ALTER TABLE "orders" ADD COLUMN "prepared_by_id" UUID;
ALTER TABLE "orders" ADD COLUMN "prepared_at" TIMESTAMP(3);

CREATE INDEX "orders_business_id_prepared_by_id_idx" ON "orders"("business_id", "prepared_by_id");

ALTER TABLE "orders" ADD CONSTRAINT "orders_prepared_by_id_fkey" FOREIGN KEY ("prepared_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
