-- CreateEnum
CREATE TYPE "TableShape" AS ENUM ('ROUND', 'SQUARE', 'RECTANGLE', 'BOOTH');
CREATE TYPE "FloorElementType" AS ENUM ('DOOR', 'WINDOW', 'RECEPTION_COUNTER', 'WALL');

-- CreateTable
CREATE TABLE "floor_plans" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 800,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 600,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "floor_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "floor_elements" (
    "id" UUID NOT NULL,
    "floor_plan_id" UUID NOT NULL,
    "type" "FloorElementType" NOT NULL,
    "layout_x" DOUBLE PRECISION NOT NULL,
    "layout_y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "options" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "floor_elements_pkey" PRIMARY KEY ("id")
);

-- Default floor plan per business that has tables
INSERT INTO "floor_plans" ("id", "business_id", "name", "level", "width", "height", "sort_order", "created_at")
SELECT gen_random_uuid(), b.id, 'Ground Floor', 1, 800, 600, 0, CURRENT_TIMESTAMP
FROM "businesses" b
WHERE EXISTS (SELECT 1 FROM "tables" t WHERE t.business_id = b.id);

-- Default floor plan for businesses without tables yet (none needed until first table)

-- Add columns to tables
ALTER TABLE "tables" ADD COLUMN "floor_plan_id" UUID;
ALTER TABLE "tables" ADD COLUMN "shape" "TableShape" NOT NULL DEFAULT 'ROUND';
ALTER TABLE "tables" ADD COLUMN "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Link existing tables to their business ground floor plan
UPDATE "tables" t
SET "floor_plan_id" = fp.id
FROM "floor_plans" fp
WHERE fp.business_id = t.business_id AND fp.name = 'Ground Floor';

-- For any orphan tables, create a plan
INSERT INTO "floor_plans" ("id", "business_id", "name", "level", "width", "height", "sort_order", "created_at")
SELECT gen_random_uuid(), t.business_id, 'Ground Floor', 1, 800, 600, 0, CURRENT_TIMESTAMP
FROM "tables" t
WHERE t.floor_plan_id IS NULL
GROUP BY t.business_id;

UPDATE "tables" t
SET "floor_plan_id" = fp.id
FROM "floor_plans" fp
WHERE t.floor_plan_id IS NULL AND fp.business_id = t.business_id AND fp.name = 'Ground Floor';

ALTER TABLE "tables" ALTER COLUMN "floor_plan_id" SET NOT NULL;

-- Drop old unique constraint and add new one
DROP INDEX IF EXISTS "tables_business_id_table_identifier_key";
CREATE UNIQUE INDEX "tables_floor_plan_id_table_identifier_key" ON "tables"("floor_plan_id", "table_identifier");

-- CreateIndex
CREATE INDEX "floor_plans_business_id_sort_order_idx" ON "floor_plans"("business_id", "sort_order");
CREATE INDEX "floor_elements_floor_plan_id_idx" ON "floor_elements"("floor_plan_id");
CREATE INDEX "tables_floor_plan_id_idx" ON "tables"("floor_plan_id");

-- AddForeignKey
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "floor_elements" ADD CONSTRAINT "floor_elements_floor_plan_id_fkey" FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tables" ADD CONSTRAINT "tables_floor_plan_id_fkey" FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
