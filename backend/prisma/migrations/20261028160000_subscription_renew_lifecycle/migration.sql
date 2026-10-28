-- Per-tenant pricing & lifecycle settings
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "custom_monthly_price" DECIMAL(10,2);
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "subscription_temp_access_until" TIMESTAMP(3);
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "subscription_temp_access_for_period_end" TIMESTAMP(3);

ALTER TABLE "platform_billing_settings" ADD COLUMN IF NOT EXISTS "grace_period_days" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "platform_billing_settings" ADD COLUMN IF NOT EXISTS "read_only_period_days" INTEGER NOT NULL DEFAULT 7;

-- Payment submissions: duration-based renewals + temp access
ALTER TABLE "payment_submissions" ADD COLUMN IF NOT EXISTS "duration_months" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "payment_submissions" ADD COLUMN IF NOT EXISTS "transaction_reference" TEXT;
ALTER TABLE "payment_submissions" ADD COLUMN IF NOT EXISTS "expected_amount" DECIMAL(10,2);
ALTER TABLE "payment_submissions" ADD COLUMN IF NOT EXISTS "renew_target_period_end" TIMESTAMP(3);
ALTER TABLE "payment_submissions" ADD COLUMN IF NOT EXISTS "temp_access_granted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payment_submissions" ADD COLUMN IF NOT EXISTS "temp_access_until" TIMESTAMP(3);
ALTER TABLE "payment_submissions" ADD COLUMN IF NOT EXISTS "temp_access_skipped" BOOLEAN NOT NULL DEFAULT false;

-- Renewal history (admin + approved tenant payments)
CREATE TABLE IF NOT EXISTS "subscription_renewals" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "payment_submission_id" UUID,
    "duration_months" INTEGER NOT NULL,
    "period_starts_at" TIMESTAMP(3) NOT NULL,
    "period_ends_at" TIMESTAMP(3) NOT NULL,
    "base_amount" DECIMAL(10,2) NOT NULL,
    "discount_type" TEXT,
    "discount_value" DECIMAL(10,2),
    "override_amount" DECIMAL(10,2),
    "final_amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "note" TEXT,
    "created_by_id" UUID,
    "idempotency_key" TEXT,
    "subscription_invoice_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_renewals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_renewals_payment_submission_id_key" ON "subscription_renewals"("payment_submission_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_renewals_idempotency_key_key" ON "subscription_renewals"("idempotency_key");
CREATE INDEX IF NOT EXISTS "subscription_renewals_business_id_created_at_idx" ON "subscription_renewals"("business_id", "created_at" DESC);

ALTER TABLE "subscription_renewals" ADD CONSTRAINT "subscription_renewals_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_renewals" ADD CONSTRAINT "subscription_renewals_payment_submission_id_fkey" FOREIGN KEY ("payment_submission_id") REFERENCES "payment_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_renewals" ADD CONSTRAINT "subscription_renewals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_renewals" ADD CONSTRAINT "subscription_renewals_subscription_invoice_id_fkey" FOREIGN KEY ("subscription_invoice_id") REFERENCES "subscription_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
