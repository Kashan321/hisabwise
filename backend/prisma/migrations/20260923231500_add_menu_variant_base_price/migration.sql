-- Cost price per menu item variant (e.g. Half, Full).
ALTER TABLE "menu_item_variants" ADD COLUMN "base_price" DECIMAL(10, 2);
