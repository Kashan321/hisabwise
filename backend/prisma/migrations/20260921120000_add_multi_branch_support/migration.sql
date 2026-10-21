-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "order_ticket_prefix" TEXT NOT NULL DEFAULT 'TKT',
    "order_ticket_reset_daily" BOOLEAN NOT NULL DEFAULT true,
    "next_order_ticket_number" INTEGER NOT NULL DEFAULT 1,
    "order_ticket_day_key" TEXT,
    "default_delivery_charge" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_branches" (
    "user_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_branches_pkey" PRIMARY KEY ("user_id","branch_id")
);

-- CreateTable
CREATE TABLE "menu_item_branch_overrides" (
    "branch_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "price" DECIMAL(10,2),
    "is_available" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_item_branch_overrides_pkey" PRIMARY KEY ("branch_id","menu_item_id")
);

-- Add branch_id columns (nullable for backfill)
ALTER TABLE "floor_plans" ADD COLUMN "branch_id" UUID;
ALTER TABLE "tables" ADD COLUMN "branch_id" UUID;
ALTER TABLE "orders" ADD COLUMN "branch_id" UUID;
ALTER TABLE "kitchen_tickets" ADD COLUMN "branch_id" UUID;
ALTER TABLE "cash_shifts" ADD COLUMN "branch_id" UUID;
ALTER TABLE "cash_drawer_movements" ADD COLUMN "branch_id" UUID;
ALTER TABLE "rider_cash_settlements" ADD COLUMN "branch_id" UUID;
ALTER TABLE "reservations" ADD COLUMN "branch_id" UUID;
ALTER TABLE "inventory_items" ADD COLUMN "branch_id" UUID;
ALTER TABLE "inventory_movements" ADD COLUMN "branch_id" UUID;
ALTER TABLE "inventory_daily_sessions" ADD COLUMN "branch_id" UUID;
ALTER TABLE "inventory_purchases" ADD COLUMN "branch_id" UUID;

-- Create default "Main Branch" for each existing business
INSERT INTO "branches" (
    "id",
    "business_id",
    "name",
    "slug",
    "is_active",
    "is_default",
    "order_ticket_prefix",
    "order_ticket_reset_daily",
    "next_order_ticket_number",
    "order_ticket_day_key",
    "default_delivery_charge",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    b."id",
    'Main Branch',
    'main',
    true,
    true,
    b."order_ticket_prefix",
    b."order_ticket_reset_daily",
    b."next_order_ticket_number",
    b."order_ticket_day_key",
    b."default_delivery_charge",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "businesses" b;

-- Backfill branch_id on operational tables
UPDATE "floor_plans" fp
SET "branch_id" = br."id"
FROM "branches" br
WHERE br."business_id" = fp."business_id" AND br."is_default" = true;

UPDATE "tables" ft
SET "branch_id" = br."id"
FROM "branches" br
WHERE br."business_id" = ft."business_id" AND br."is_default" = true;

UPDATE "orders" o
SET "branch_id" = br."id"
FROM "branches" br
WHERE br."business_id" = o."business_id" AND br."is_default" = true;

UPDATE "kitchen_tickets" kt
SET "branch_id" = br."id"
FROM "branches" br
WHERE br."business_id" = kt."business_id" AND br."is_default" = true;

UPDATE "cash_shifts" cs
SET "branch_id" = br."id"
FROM "branches" br
WHERE br."business_id" = cs."business_id" AND br."is_default" = true;

UPDATE "cash_drawer_movements" cdm
SET "branch_id" = br."id"
FROM "branches" br
WHERE br."business_id" = cdm."business_id" AND br."is_default" = true;

UPDATE "rider_cash_settlements" rcs
SET "branch_id" = br."id"
FROM "branches" br
WHERE br."business_id" = rcs."business_id" AND br."is_default" = true;

UPDATE "reservations" r
SET "branch_id" = br."id"
FROM "branches" br
WHERE br."business_id" = r."business_id" AND br."is_default" = true;

UPDATE "inventory_items" ii
SET "branch_id" = br."id"
FROM "branches" br
WHERE br."business_id" = ii."business_id" AND br."is_default" = true;

UPDATE "inventory_movements" im
SET "branch_id" = br."id"
FROM "branches" br
WHERE br."business_id" = im."business_id" AND br."is_default" = true;

UPDATE "inventory_daily_sessions" ids
SET "branch_id" = br."id"
FROM "branches" br
WHERE br."business_id" = ids."business_id" AND br."is_default" = true;

UPDATE "inventory_purchases" ip
SET "branch_id" = br."id"
FROM "branches" br
WHERE br."business_id" = ip."business_id" AND br."is_default" = true;

-- Assign all existing users to their business default branch
INSERT INTO "user_branches" ("user_id", "branch_id", "is_default")
SELECT u."id", br."id", true
FROM "users" u
JOIN "branches" br ON br."business_id" = u."business_id" AND br."is_default" = true
WHERE u."business_id" IS NOT NULL;

-- Make branch_id required
ALTER TABLE "floor_plans" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "tables" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "kitchen_tickets" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "cash_shifts" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "cash_drawer_movements" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "rider_cash_settlements" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "reservations" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "inventory_items" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "inventory_movements" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "inventory_daily_sessions" ALTER COLUMN "branch_id" SET NOT NULL;
ALTER TABLE "inventory_purchases" ALTER COLUMN "branch_id" SET NOT NULL;

-- Drop old inventory unique constraint and add branch-scoped one
ALTER TABLE "inventory_items" DROP CONSTRAINT IF EXISTS "inventory_items_business_id_name_key";
CREATE UNIQUE INDEX "inventory_items_branch_id_name_key" ON "inventory_items"("branch_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "branches_business_id_slug_key" ON "branches"("business_id", "slug");
CREATE INDEX "branches_business_id_is_active_idx" ON "branches"("business_id", "is_active");
CREATE INDEX "user_branches_branch_id_idx" ON "user_branches"("branch_id");
CREATE INDEX "floor_plans_branch_id_sort_order_idx" ON "floor_plans"("branch_id", "sort_order");
CREATE INDEX "tables_branch_id_status_idx" ON "tables"("branch_id", "status");
CREATE INDEX "orders_branch_id_status_created_at_idx" ON "orders"("branch_id", "status", "created_at");
CREATE INDEX "orders_branch_id_is_draft_idx" ON "orders"("branch_id", "is_draft");
CREATE INDEX "kitchen_tickets_branch_id_status_created_at_idx" ON "kitchen_tickets"("branch_id", "status", "created_at");
CREATE INDEX "cash_shifts_branch_id_status_opened_at_idx" ON "cash_shifts"("branch_id", "status", "opened_at");
CREATE INDEX "cash_drawer_movements_branch_id_cash_shift_id_created_at_idx" ON "cash_drawer_movements"("branch_id", "cash_shift_id", "created_at");
CREATE INDEX "rider_cash_settlements_branch_id_status_created_at_idx" ON "rider_cash_settlements"("branch_id", "status", "created_at");
CREATE INDEX "reservations_branch_id_reservation_time_idx" ON "reservations"("branch_id", "reservation_time");
CREATE INDEX "inventory_items_branch_id_is_active_idx" ON "inventory_items"("branch_id", "is_active");
CREATE INDEX "inventory_movements_branch_id_inventory_item_id_created_at_idx" ON "inventory_movements"("branch_id", "inventory_item_id", "created_at");
CREATE INDEX "inventory_daily_sessions_branch_id_status_idx" ON "inventory_daily_sessions"("branch_id", "status");
CREATE INDEX "inventory_daily_sessions_branch_id_session_date_idx" ON "inventory_daily_sessions"("branch_id", "session_date");
CREATE INDEX "inventory_purchases_branch_id_purchased_at_idx" ON "inventory_purchases"("branch_id", "purchased_at");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_branches" ADD CONSTRAINT "user_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "menu_item_branch_overrides" ADD CONSTRAINT "menu_item_branch_overrides_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "menu_item_branch_overrides" ADD CONSTRAINT "menu_item_branch_overrides_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tables" ADD CONSTRAINT "tables_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kitchen_tickets" ADD CONSTRAINT "kitchen_tickets_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_shifts" ADD CONSTRAINT "cash_shifts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_drawer_movements" ADD CONSTRAINT "cash_drawer_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rider_cash_settlements" ADD CONSTRAINT "rider_cash_settlements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_daily_sessions" ADD CONSTRAINT "inventory_daily_sessions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_purchases" ADD CONSTRAINT "inventory_purchases_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
