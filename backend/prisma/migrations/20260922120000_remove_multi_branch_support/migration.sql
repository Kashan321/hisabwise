-- Roll back multi-branch schema. Operational rows are preserved; only branch columns/tables are removed.

-- Drop foreign keys on branch_id columns
ALTER TABLE "floor_plans" DROP CONSTRAINT IF EXISTS "floor_plans_branch_id_fkey";
ALTER TABLE "tables" DROP CONSTRAINT IF EXISTS "tables_branch_id_fkey";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_branch_id_fkey";
ALTER TABLE "kitchen_tickets" DROP CONSTRAINT IF EXISTS "kitchen_tickets_branch_id_fkey";
ALTER TABLE "cash_shifts" DROP CONSTRAINT IF EXISTS "cash_shifts_branch_id_fkey";
ALTER TABLE "cash_drawer_movements" DROP CONSTRAINT IF EXISTS "cash_drawer_movements_branch_id_fkey";
ALTER TABLE "rider_cash_settlements" DROP CONSTRAINT IF EXISTS "rider_cash_settlements_branch_id_fkey";
ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reservations_branch_id_fkey";
ALTER TABLE "inventory_items" DROP CONSTRAINT IF EXISTS "inventory_items_branch_id_fkey";
ALTER TABLE "inventory_movements" DROP CONSTRAINT IF EXISTS "inventory_movements_branch_id_fkey";
ALTER TABLE "inventory_daily_sessions" DROP CONSTRAINT IF EXISTS "inventory_daily_sessions_branch_id_fkey";
ALTER TABLE "inventory_purchases" DROP CONSTRAINT IF EXISTS "inventory_purchases_branch_id_fkey";

-- Drop branch-scoped indexes
DROP INDEX IF EXISTS "floor_plans_branch_id_sort_order_idx";
DROP INDEX IF EXISTS "tables_branch_id_status_idx";
DROP INDEX IF EXISTS "orders_branch_id_status_created_at_idx";
DROP INDEX IF EXISTS "orders_branch_id_is_draft_idx";
DROP INDEX IF EXISTS "kitchen_tickets_branch_id_status_created_at_idx";
DROP INDEX IF EXISTS "cash_shifts_branch_id_status_opened_at_idx";
DROP INDEX IF EXISTS "cash_drawer_movements_branch_id_cash_shift_id_created_at_idx";
DROP INDEX IF EXISTS "rider_cash_settlements_branch_id_status_created_at_idx";
DROP INDEX IF EXISTS "reservations_branch_id_reservation_time_idx";
DROP INDEX IF EXISTS "inventory_items_branch_id_is_active_idx";
DROP INDEX IF EXISTS "inventory_movements_branch_id_inventory_item_id_created_at_idx";
DROP INDEX IF EXISTS "inventory_daily_sessions_branch_id_status_idx";
DROP INDEX IF EXISTS "inventory_daily_sessions_branch_id_session_date_idx";
DROP INDEX IF EXISTS "inventory_purchases_branch_id_purchased_at_idx";

-- Drop branch_id columns (data rows remain intact)
ALTER TABLE "floor_plans" DROP COLUMN IF EXISTS "branch_id";
ALTER TABLE "tables" DROP COLUMN IF EXISTS "branch_id";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "branch_id";
ALTER TABLE "kitchen_tickets" DROP COLUMN IF EXISTS "branch_id";
ALTER TABLE "cash_shifts" DROP COLUMN IF EXISTS "branch_id";
ALTER TABLE "cash_drawer_movements" DROP COLUMN IF EXISTS "branch_id";
ALTER TABLE "rider_cash_settlements" DROP COLUMN IF EXISTS "branch_id";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "branch_id";
ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "branch_id";
ALTER TABLE "inventory_movements" DROP COLUMN IF EXISTS "branch_id";
ALTER TABLE "inventory_daily_sessions" DROP COLUMN IF EXISTS "branch_id";
ALTER TABLE "inventory_purchases" DROP COLUMN IF EXISTS "branch_id";

-- Restore business-scoped inventory uniqueness
DROP INDEX IF EXISTS "inventory_items_branch_id_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_business_id_name_key" ON "inventory_items"("business_id", "name");

-- Drop branch infrastructure tables
DROP TABLE IF EXISTS "menu_item_branch_overrides";
DROP TABLE IF EXISTS "user_branches";
DROP TABLE IF EXISTS "branches";

-- Remove branch permissions (optional cleanup)
DELETE FROM "role_permissions"
WHERE "permission_id" IN (
  SELECT "id" FROM "permissions" WHERE "key" IN ('branches.manage', 'branches.view')
);
DELETE FROM "permissions" WHERE "key" IN ('branches.manage', 'branches.view');
