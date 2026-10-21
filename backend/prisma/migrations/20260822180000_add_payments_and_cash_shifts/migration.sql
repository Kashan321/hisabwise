-- Extend payment methods
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'BANK_TRANSFER';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'WALLET';

-- Order payment status
CREATE TYPE "OrderPaymentStatus" AS ENUM ('PAID', 'PARTIAL', 'PENDING', 'FAILED');
CREATE TYPE "CashShiftStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "CashDrawerMovementType" AS ENUM ('OPENING', 'SALE', 'REFUND', 'PAY_IN', 'PAY_OUT', 'CLOSING');

-- Cash shifts
CREATE TABLE "cash_shifts" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "opened_by_id" UUID NOT NULL,
    "closed_by_id" UUID,
    "status" "CashShiftStatus" NOT NULL DEFAULT 'OPEN',
    "opening_cash" DECIMAL(10,2) NOT NULL,
    "expected_cash" DECIMAL(10,2),
    "actual_cash" DECIMAL(10,2),
    "variance" DECIMAL(10,2),
    "notes" TEXT,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "cash_shifts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cash_shifts_business_id_status_opened_at_idx" ON "cash_shifts"("business_id", "status", "opened_at");

ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Order payment fields
ALTER TABLE "orders" ADD COLUMN "payment_status" "OrderPaymentStatus";
ALTER TABLE "orders" ADD COLUMN "cash_shift_id" UUID;
ALTER TABLE "orders" ADD COLUMN "completed_by_id" UUID;

CREATE INDEX "orders_business_id_cash_shift_id_idx" ON "orders"("business_id", "cash_shift_id");

ALTER TABLE "orders" ADD CONSTRAINT "orders_cash_shift_id_fkey" FOREIGN KEY ("cash_shift_id") REFERENCES "cash_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Order payment lines
CREATE TABLE "order_payments" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "cash_shift_id" UUID,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "amount_received" DECIMAL(10,2),
    "change_given" DECIMAL(10,2),
    "reference_number" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_payments_business_id_order_id_idx" ON "order_payments"("business_id", "order_id");
CREATE INDEX "order_payments_business_id_cash_shift_id_idx" ON "order_payments"("business_id", "cash_shift_id");

ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_cash_shift_id_fkey" FOREIGN KEY ("cash_shift_id") REFERENCES "cash_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Cash drawer movements
CREATE TABLE "cash_drawer_movements" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "cash_shift_id" UUID NOT NULL,
    "type" "CashDrawerMovementType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "order_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_drawer_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cash_drawer_movements_business_id_cash_shift_id_created_at_idx" ON "cash_drawer_movements"("business_id", "cash_shift_id", "created_at");

ALTER TABLE "cash_drawer_movements" ADD CONSTRAINT "cash_drawer_movements_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_drawer_movements" ADD CONSTRAINT "cash_drawer_movements_cash_shift_id_fkey" FOREIGN KEY ("cash_shift_id") REFERENCES "cash_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_drawer_movements" ADD CONSTRAINT "cash_drawer_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
