-- Purchase receipts (paid invoices) after subscription purchase

CREATE TYPE "SubscriptionInvoiceKind" AS ENUM ('PAYMENT_REQUEST', 'PURCHASE_RECEIPT');

ALTER TABLE "subscription_invoices" ADD COLUMN "kind" "SubscriptionInvoiceKind" NOT NULL DEFAULT 'PAYMENT_REQUEST';
ALTER TABLE "subscription_invoices" ADD COLUMN "period_ends_at" TIMESTAMP(3);
ALTER TABLE "subscription_invoices" ADD COLUMN "payment_submission_id" UUID;

CREATE UNIQUE INDEX "subscription_invoices_payment_submission_id_key" ON "subscription_invoices"("payment_submission_id");
CREATE INDEX "subscription_invoices_business_id_kind_status_alert_ends_at_idx" ON "subscription_invoices"("business_id", "kind", "status", "alert_ends_at");

ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_payment_submission_id_fkey" FOREIGN KEY ("payment_submission_id") REFERENCES "payment_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
