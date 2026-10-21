-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED');

-- CreateEnum
CREATE TYPE "OrderChangeRequestType" AS ENUM ('CANCEL_ORDER', 'REMOVE_ITEM', 'MODIFY_ITEM');

-- CreateEnum
CREATE TYPE "OrderChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "OrderSource" ADD VALUE 'ONLINE_DELIVERY';

-- AlterTable
ALTER TABLE "tables" ADD COLUMN "assigned_waiter_id" UUID;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "waiter_id" UUID,
ADD COLUMN "rider_id" UUID,
ADD COLUMN "order_type" "OrderType" NOT NULL DEFAULT 'DINE_IN',
ADD COLUMN "delivery_status" "DeliveryStatus",
ADD COLUMN "is_draft" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sent_to_kitchen_at" TIMESTAMP(3),
ADD COLUMN "customer_name" TEXT,
ADD COLUMN "customer_phone" TEXT,
ADD COLUMN "delivery_address" TEXT,
ADD COLUMN "delivery_notes" TEXT;

-- CreateTable
CREATE TABLE "order_change_requests" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "reviewed_by_id" UUID,
    "type" "OrderChangeRequestType" NOT NULL,
    "status" "OrderChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "reason" TEXT,
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_audit_logs" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tables_assigned_waiter_id_idx" ON "tables"("assigned_waiter_id");

-- CreateIndex
CREATE INDEX "orders_business_id_waiter_id_idx" ON "orders"("business_id", "waiter_id");

-- CreateIndex
CREATE INDEX "orders_business_id_rider_id_idx" ON "orders"("business_id", "rider_id");

-- CreateIndex
CREATE INDEX "orders_business_id_order_type_delivery_status_idx" ON "orders"("business_id", "order_type", "delivery_status");

-- CreateIndex
CREATE INDEX "orders_business_id_is_draft_idx" ON "orders"("business_id", "is_draft");

-- CreateIndex
CREATE INDEX "order_change_requests_business_id_order_id_status_idx" ON "order_change_requests"("business_id", "order_id", "status");

-- CreateIndex
CREATE INDEX "order_change_requests_business_id_status_created_at_idx" ON "order_change_requests"("business_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "tenant_audit_logs_business_id_created_at_idx" ON "tenant_audit_logs"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "tenant_audit_logs_business_id_user_id_created_at_idx" ON "tenant_audit_logs"("business_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "tenant_audit_logs_target_type_target_id_idx" ON "tenant_audit_logs"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_assigned_waiter_id_fkey" FOREIGN KEY ("assigned_waiter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_change_requests" ADD CONSTRAINT "order_change_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_change_requests" ADD CONSTRAINT "order_change_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_change_requests" ADD CONSTRAINT "order_change_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_change_requests" ADD CONSTRAINT "order_change_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_audit_logs" ADD CONSTRAINT "tenant_audit_logs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_audit_logs" ADD CONSTRAINT "tenant_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
