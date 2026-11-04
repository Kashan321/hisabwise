CREATE TABLE "platform_tenant_alerts" (
    "id" UUID NOT NULL,
    "body_text" TEXT NOT NULL,
    "link_url" TEXT,
    "link_label" TEXT,
    "image_url" TEXT,
    "start_date" VARCHAR(10) NOT NULL,
    "end_date" VARCHAR(10) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_tenant_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_alert_dismissals" (
    "id" UUID NOT NULL,
    "alert_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "dismiss_on" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_alert_dismissals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_tenant_alerts_is_active_start_date_end_date_idx" ON "platform_tenant_alerts"("is_active", "start_date", "end_date");

CREATE UNIQUE INDEX "tenant_alert_dismissals_alert_id_user_id_dismiss_on_key" ON "tenant_alert_dismissals"("alert_id", "user_id", "dismiss_on");

CREATE INDEX "tenant_alert_dismissals_user_id_dismiss_on_idx" ON "tenant_alert_dismissals"("user_id", "dismiss_on");

ALTER TABLE "tenant_alert_dismissals" ADD CONSTRAINT "tenant_alert_dismissals_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "platform_tenant_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_alert_dismissals" ADD CONSTRAINT "tenant_alert_dismissals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
