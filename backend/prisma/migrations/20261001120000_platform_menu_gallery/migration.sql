-- CreateTable
CREATE TABLE "platform_menu_gallery_images" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "search_terms" TEXT,
    "image_url" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_menu_gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_menu_gallery_images_is_active_display_order_idx" ON "platform_menu_gallery_images"("is_active", "display_order");
