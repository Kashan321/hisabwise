'use client';

import { useMemo, useState } from 'react';
import type { MenuGalleryImage } from '@/lib/api/types';
import { Button, Icon, Input } from '@/components/ui';
import { Modal } from '@/components/ui/modal';

function matchesQuery(image: MenuGalleryImage, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (image.label.toLowerCase().includes(q)) return true;
  if (image.searchTerms?.toLowerCase().includes(q)) return true;
  return false;
}

export function MenuGalleryPickerModal({
  open,
  onClose,
  images,
  loading,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  images: MenuGalleryImage[];
  loading?: boolean;
  onSelect: (image: MenuGalleryImage) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => images.filter((img) => matchesQuery(img, query.trim())),
    [images, query],
  );

  return (
    <Modal open={open} onClose={onClose} title="Choose from gallery" size="lg">
      <div className="space-y-4">
        <Input
          label="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. chai, biryani, coffee"
        />

        {loading ? (
          <p className="font-body-base text-on-surface-variant py-8 text-center">Loading gallery…</p>
        ) : images.length === 0 ? (
          <p className="font-body-base text-on-surface-variant py-8 text-center">
            No stock photos available yet. Upload your own image instead.
          </p>
        ) : filtered.length === 0 ? (
          <p className="font-body-base text-on-surface-variant py-8 text-center">
            No matches for &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[min(60vh,28rem)] overflow-y-auto pr-1">
            {filtered.map((image) => (
              <button
                key={image.id}
                type="button"
                className="group text-left rounded-xl border border-outline-variant/30 overflow-hidden bg-surface-container-lowest hover:border-primary hover:ring-2 hover:ring-primary/20 transition-all"
                onClick={() => {
                  onSelect(image);
                  onClose();
                }}
              >
                <div className="aspect-square bg-surface-container relative">
                  {image.imageReadUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.imageReadUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon name="image" className="text-3xl text-on-surface-variant/40" />
                    </div>
                  )}
                </div>
                <p className="px-2 py-2 font-caption font-semibold text-on-surface truncate">
                  {image.label}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
