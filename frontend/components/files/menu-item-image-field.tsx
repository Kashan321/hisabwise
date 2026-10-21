'use client';

import { useRef, useState } from 'react';
import { ImageUploadField } from '@/components/files/image-upload-field';
import { MenuGalleryPickerModal } from '@/components/files/menu-gallery-picker-modal';
import { Button, Icon } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { useMenuGalleryImages } from '@/lib/hooks/queries';
import type { MenuGalleryImage } from '@/lib/api/types';
import { useToast } from '@/lib/toast';

export function MenuItemImageField({
  value,
  onChange,
  folder = 'menu',
  label = 'Item photo',
  hint = 'JPEG, PNG, WebP, GIF, or SVG. Shown on your menu and QR ordering.',
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
  hint?: string;
}) {
  const toast = useToast();
  const uploadTriggerRef = useRef<HTMLInputElement | null>(null);
  const { data: galleryImages = [], isLoading: galleryLoading } = useMenuGalleryImages();
  const [sourceChoiceOpen, setSourceChoiceOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const hasGallery = galleryImages.length > 0;

  function handleGalleryPick(image: MenuGalleryImage) {
    onChange(image.imageUrl);
    toast.success(`Using stock photo: ${image.label}`);
  }

  function promptBeforeUpload() {
    if (hasGallery) {
      setSourceChoiceOpen(true);
      return false;
    }
    return true;
  }

  return (
    <>
      <ImageUploadField
        label={label}
        value={value}
        onChange={onChange}
        folder={folder}
        hint={hint}
        emptyIcon="local_cafe"
        onEmptyClick={hasGallery ? () => setSourceChoiceOpen(true) : undefined}
        onBeforeUpload={promptBeforeUpload}
        uploadTriggerRef={uploadTriggerRef}
      />

      {hasGallery && (
        <Button
          type="button"
          variant="ghost"
          className="text-sm -mt-1"
          onClick={() => setGalleryOpen(true)}
        >
          <Icon name="collections" className="text-lg" />
          {value ? 'Change to gallery photo' : 'Browse gallery'}
        </Button>
      )}

      <Modal
        open={sourceChoiceOpen}
        onClose={() => setSourceChoiceOpen(false)}
        title="Add item photo"
        size="sm"
      >
        <div className="space-y-3">
          <p className="font-body-base text-on-surface-variant text-sm">
            Use a ready-made photo (chai, biryani, coffee, etc.) or upload your own.
          </p>
          <Button
            type="button"
            variant="primary"
            className="w-full justify-center"
            onClick={() => {
              setSourceChoiceOpen(false);
              setGalleryOpen(true);
            }}
          >
            <Icon name="collections" className="text-lg" />
            Choose from gallery
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            onClick={() => {
              setSourceChoiceOpen(false);
              uploadTriggerRef.current?.click();
            }}
          >
            <Icon name="cloud_upload" className="text-lg" />
            Upload my photo
          </Button>
        </div>
      </Modal>

      <MenuGalleryPickerModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        images={galleryImages}
        loading={galleryLoading}
        onSelect={handleGalleryPick}
      />
    </>
  );
}
