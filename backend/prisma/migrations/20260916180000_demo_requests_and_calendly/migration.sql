-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN "calendly_url" TEXT;

-- CreateEnum
CREATE TYPE "DemoRequestStatus" AS ENUM ('PENDING', 'SCHEDULED', 'CONTACTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DemoRequestSource" AS ENUM ('CALENDLY', 'MANUAL');

-- CreateTable
CREATE TABLE "demo_requests" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "event_name" TEXT,
    "calendly_invitee_uri" TEXT,
    "status" "DemoRequestStatus" NOT NULL DEFAULT 'PENDING',
    "source" "DemoRequestSource" NOT NULL DEFAULT 'MANUAL',
    "admin_note" TEXT,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demo_requests_calendly_invitee_uri_key" ON "demo_requests"("calendly_invitee_uri");

-- CreateIndex
CREATE INDEX "demo_requests_status_created_at_idx" ON "demo_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "demo_requests_email_idx" ON "demo_requests"("email");

-- AddForeignKey
ALTER TABLE "demo_requests" ADD CONSTRAINT "demo_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
