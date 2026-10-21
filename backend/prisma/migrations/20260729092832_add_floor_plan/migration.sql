-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'NEEDS_CLEANING');

-- CreateTable
CREATE TABLE "tables" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "table_identifier" TEXT NOT NULL,
    "layout_x" DOUBLE PRECISION NOT NULL,
    "layout_y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tables_business_id_status_idx" ON "tables"("business_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tables_business_id_table_identifier_key" ON "tables"("business_id", "table_identifier");

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
