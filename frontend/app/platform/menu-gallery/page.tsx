'use client';

import { useMemo, useState } from 'react';
import { PlatformLayout } from '@/components/layouts/platform-layout';
import { ImageUploadField } from '@/components/files/image-upload-field';
import { Button, Input } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-shell';
import { formatApiError } from '@/lib/api/errors';
import type { MenuGalleryImage } from '@/lib/api/types';
import {
  useCreateMenuGalleryImage,
  useDeleteMenuGalleryImage,
  useUpdateMenuGalleryImage,
} from '@/lib/hooks/mutations';
import { MenuGalleryImportModal } from '@/components/menu-gallery/menu-gallery-import-modal';
import { usePlatformMenuGallery } from '@/lib/hooks/queries';
import { useToast } from '@/lib/toast';

type FormState = {
  label: string;
  searchTerms: string;
  imageUrl: string | null;
  displayOrder: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  label: '',
  searchTerms: '',
  imageUrl: null,
  displayOrder: '0',
  isActive: true,
};

export default function PlatformMenuGalleryPage() {
  const toast = useToast();
  const { data: images = [], isLoading } = usePlatformMenuGallery();
  const createImage = useCreateMenuGalleryImage();
  const updateImage = useUpdateMenuGalleryImage();
  const deleteImage = useDeleteMenuGalleryImage();

  const [importOpen, setImportOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MenuGalleryImage | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');

  const sorted = useMemo(
    () => [...images].sort((a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label)),
    [images],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setEditorOpen(true);
  }

  function openEdit(image: MenuGalleryImage) {
    setEditing(image);
    setForm({
      label: image.label,
      searchTerms: image.searchTerms ?? '',
      imageUrl: image.imageUrl,
      displayOrder: String(image.displayOrder),
      isActive: image.isActive,
    });
    setError('');
    setEditorOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const label = form.label.trim();
    if (!label) {
      setError('Label is required.');
      return;
    }
    if (!form.imageUrl) {
      setError('Upload an image first.');
      return;
    }

    const payload = {
      label,
      searchTerms: form.searchTerms.trim() || null,
      imageUrl: form.imageUrl,
      displayOrder: Number(form.displayOrder) || 0,
      isActive: form.isActive,
    };

    try {
      if (editing) {
        await updateImage.mutateAsync({ id: editing.id, ...payload });
        toast.success('Gallery image updated');
      } else {
        await createImage.mutateAsync(payload);
        toast.success('Gallery image added');
      }
      setEditorOpen(false);
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function handleDelete(image: MenuGalleryImage) {
    if (!confirm(`Remove “${image.label}” from the gallery?`)) return;
    try {
      await deleteImage.mutateAsync(image.id);
      toast.success('Removed from gallery');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  return (
    <PlatformLayout title="Menu gallery">
      <PageHeader
        title="Menu photo gallery"
        description="Stock photos for common dishes and drinks. Tenants can pick these when adding menu item photos."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
              Import CSV
            </Button>
            <Button type="button" variant="primary" onClick={openCreate}>
              Add stock photo
            </Button>
          </div>
        }
      />

      <MenuGalleryImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      {isLoading ? (
        <p className="font-body-base text-on-surface-variant">Loading gallery…</p>
      ) : sorted.length === 0 ? (
        <section className="p-8 rounded-xl bg-surface-container-lowest card-hairline text-center space-y-3">
          <p className="font-body-base text-on-surface-variant">No stock photos yet.</p>
          <Button type="button" variant="primary" onClick={openCreate}>Add your first image</Button>
        </section>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sorted.map((image) => (
            <article
              key={image.id}
              className="rounded-xl border border-outline-variant/25 bg-surface-container-lowest overflow-hidden"
            >
              <div className="aspect-square bg-surface-container relative">
                {image.imageReadUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.imageReadUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : null}
                {!image.isActive && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-surface/90 font-caption text-xs">
                    Hidden
                  </span>
                )}
              </div>
              <div className="p-3 space-y-2">
                <p className="font-body-emphasis truncate">{image.label}</p>
                {image.searchTerms && (
                  <p className="font-caption text-on-surface-variant truncate">{image.searchTerms}</p>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 text-sm" onClick={() => openEdit(image)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" className="text-sm text-error" onClick={() => handleDelete(image)}>
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit stock photo' : 'Add stock photo'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <ImageUploadField
            label="Image"
            value={form.imageUrl}
            onChange={(imageUrl) => setForm((f) => ({ ...f, imageUrl }))}
            folder="menu-gallery"
            aspect="square"
            uploadAuth="platform"
            allowPasteUrl
            hint="Upload, paste a direct https link, or use a storage key from CSV import."
          />
          <Input
            label="Label"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="Chai"
            required
          />
          <Input
            label="Search keywords (optional)"
            value={form.searchTerms}
            onChange={(e) => setForm((f) => ({ ...f, searchTerms: e.target.value }))}
            placeholder="tea, karak, doodh patti"
          />
          <p className="font-caption text-on-surface-variant -mt-2">
            Comma-separated keywords help tenants find this photo.
          </p>
          <Input
            label="Sort order"
            type="number"
            min={0}
            value={form.displayOrder}
            onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
          />
          <label className="flex items-center gap-2 font-body-base cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-outline-variant"
            />
            Visible to tenants
          </label>

          {error && (
            <p className="text-sm text-error bg-error-container/30 px-3 py-2 rounded-xl">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="primary"
              loading={createImage.isPending || updateImage.isPending}
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </PlatformLayout>
  );
}
