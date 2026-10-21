-- Subscription invoices sent by platform admins to tenants

CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM ('OPEN', 'PAID', 'CANCELLED');

CREATE TABLE "subscription_invoices" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "billing_interval" "BillingInterval",
    "due_at" TIMESTAMP(3) NOT NULL,
    "alert_days" INTEGER NOT NULL,
    "alert_ends_at" TIMESTAMP(3) NOT NULL,
    "pdf_storage_key" TEXT NOT NULL,
    "note" TEXT,
    "status" "SubscriptionInvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "sent_by_id" UUID,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_invoices_business_id_invoice_number_key" ON "subscription_invoices"("business_id", "invoice_number");
CREATE INDEX "subscription_invoices_business_id_status_alert_ends_at_idx" ON "subscription_invoices"("business_id", "status", "alert_ends_at");

ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "subscription_invoices_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
