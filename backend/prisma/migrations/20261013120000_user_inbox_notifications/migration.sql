-- In-app notification inbox per user + browser notification preferences

CREATE TYPE "InboxNotificationCategory" AS ENUM (
  'ORDER',
  'KITCHEN',
  'RESERVATION',
  'BILLING',
  'INVENTORY',
  'DELIVERY',
  'SYSTEM',
  'PROMOTION'
);

CREATE TABLE "user_inbox_notifications" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" "InboxNotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "action_label" TEXT,
    "action_href" TEXT,
    "metadata" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_inbox_notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_notification_preferences" (
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "browser_enabled" BOOLEAN NOT NULL DEFAULT false,
    "browser_categories" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("user_id")
);

CREATE INDEX "user_inbox_notifications_user_id_business_id_read_at_created_at_idx" ON "user_inbox_notifications"("user_id", "business_id", "read_at", "created_at");
CREATE INDEX "user_inbox_notifications_business_id_created_at_idx" ON "user_inbox_notifications"("business_id", "created_at");
CREATE UNIQUE INDEX "user_notification_preferences_user_id_business_id_key" ON "user_notification_preferences"("user_id", "business_id");

ALTER TABLE "user_inbox_notifications" ADD CONSTRAINT "user_inbox_notifications_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_inbox_notifications" ADD CONSTRAINT "user_inbox_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
