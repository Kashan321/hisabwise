-- Menu item cost price for profit estimation (sale price stays on price column).
ALTER TABLE "menu_items" ADD COLUMN "base_price" DECIMAL(10, 2);
