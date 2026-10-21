-- CreateEnum
CREATE TYPE "FeedbackTicketType" AS ENUM ('FEEDBACK', 'BUG_REPORT');

-- CreateEnum
CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "FeedbackTicketStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "feedback_tickets" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "type" "FeedbackTicketType" NOT NULL,
    "priority" "FeedbackPriority" NOT NULL DEFAULT 'MEDIUM',
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "image_key" TEXT,
    "status" "FeedbackTicketStatus" NOT NULL DEFAULT 'OPEN',
    "admin_note" TEXT,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_feedback_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website_url" TEXT,
    "support_hours" TEXT,
    "extra_note" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_feedback_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_tickets_business_id_status_created_at_idx" ON "feedback_tickets"("business_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "feedback_tickets_status_created_at_idx" ON "feedback_tickets"("status", "created_at");

-- AddForeignKey
ALTER TABLE "feedback_tickets" ADD CONSTRAINT "feedback_tickets_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_tickets" ADD CONSTRAINT "feedback_tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_tickets" ADD CONSTRAINT "feedback_tickets_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
