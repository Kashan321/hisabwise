'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Icon, Input, Spinner } from '@/components/ui';
import { formatApiError } from '@/lib/api/errors';
import { getFileReadUrl } from '@/lib/api/upload';
import { useUploadFile } from '@/lib/hooks/mutations';
import { useToast } from '@/lib/toast';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml';

function isAcceptedImage(file: File): boolean {
  return ACCEPT.split(',').includes(file.type);
}

function isHttpImageUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ImageUploadField({
  label,
  value,
  onChange,
  folder,
  hint,
  aspect = 'video',
  emptyIcon = 'image',
  disabled,
  onEmptyClick,
  onBeforeUpload,
  uploadTriggerRef,
  uploadAuth = 'tenant',
  allowPasteUrl = false,
}: {
  label?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  hint?: string;
  aspect?: 'video' | 'square';
  emptyIcon?: string;
  disabled?: boolean;
  /** When set, empty state click opens custom flow instead of file picker. */
  onEmptyClick?: () => void;
  /** Return false to cancel opening the file picker (e.g. show gallery choice first). */
  onBeforeUpload?: () => boolean;
  uploadTriggerRef?: React.RefObject<HTMLInputElement | null>;
  uploadAuth?: 'tenant' | 'platform';
  /** Show a field to paste a direct http(s) image link instead of uploading. */
  allowPasteUrl?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useUploadFile();
  const toast = useToast();
  const [previewError, setPreviewError] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState('');

  const heightClass = aspect === 'square' ? 'h-40' : 'h-40 md:h-48';
  const busy = disabled || uploadFile.isPending;

  useEffect(() => {
    if (uploadTriggerRef) {
      uploadTriggerRef.current = inputRef.current;
    }
  });

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      if (allowPasteUrl) setUrlDraft('');
      return;
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      setPreviewUrl(value);
      if (allowPasteUrl) setUrlDraft(value);
      return;
    }

    if (allowPasteUrl) setUrlDraft('');

    let cancelled = false;
    getFileReadUrl(value)
      .then((result) => {
        if (!cancelled) setPreviewUrl(result.url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value, allowPasteUrl]);

  function applyPastedUrl() {
    const trimmed = urlDraft.trim();
    if (!isHttpImageUrl(trimmed)) {
      toast.error('Enter a valid http or https image URL');
      return;
    }
    onChange(trimmed);
    setPreviewUrl(trimmed);
    setPreviewError(false);
    toast.success('Image URL applied');
  }

  const displaySrc = previewUrl;
  const hasPreview = Boolean(displaySrc && !previewError);

  async function handleFileSelected(file: File | undefined) {
    if (!file || busy) return;

    if (!isAcceptedImage(file)) {
      toast.error('Unsupported file type. Use JPEG, PNG, WebP, GIF, or SVG.');
      return;
    }

    try {
      const uploaded = await uploadFile.mutateAsync({ file, folder, auth: uploadAuth });
      onChange(uploaded.key);
      setPreviewUrl(uploaded.url);
      setPreviewError(false);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!busy) setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    void handleFileSelected(file);
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="font-caption text-on-surface-variant font-bold block">{label}</label>
      )}

      <div
        className={`relative ${heightClass} rounded-xl border-2 border-dashed overflow-hidden transition-all ${
          dragActive
            ? 'border-secondary bg-secondary/10 ring-2 ring-secondary/20'
            : 'border-outline-variant/40 bg-gradient-to-br from-primary-fixed/40 to-surface-container'
        } ${busy ? 'opacity-70' : ''} ${!hasPreview && !busy ? 'cursor-pointer' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (hasPreview || busy) return;
          if (onEmptyClick) {
            onEmptyClick();
            return;
          }
          inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !hasPreview && !busy) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role={!hasPreview ? 'button' : undefined}
        tabIndex={!hasPreview && !busy ? 0 : undefined}
      >
        {hasPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displaySrc!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setPreviewError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Icon
              name={dragActive ? 'file_download' : emptyIcon}
              className={`text-4xl ${dragActive ? 'text-secondary' : 'text-on-surface-variant/40'}`}
            />
            <div className="space-y-1">
              <p className="font-body-emphasis text-on-surface-variant">
                {dragActive ? 'Drop image here' : 'No image yet'}
              </p>
              {!dragActive && (
                <p className="font-caption text-on-surface-variant/70">
                  Drag & drop or click to upload
                </p>
              )}
            </div>
            {!dragActive && (
              <Button
                type="button"
                variant="outline"
                className="px-4 py-2 text-sm bg-surface/90"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onBeforeUpload && !onBeforeUpload()) return;
                  inputRef.current?.click();
                }}
              >
                <Icon name="cloud_upload" className="text-lg" />
                Upload image
              </Button>
            )}
          </div>
        )}

        {hasPreview && !uploadFile.isPending && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-primary/40 opacity-0 hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="outline"
              className="px-4 py-2 text-sm bg-surface/95"
              disabled={busy}
              onClick={() => {
                if (onBeforeUpload && !onBeforeUpload()) return;
                inputRef.current?.click();
              }}
            >
              <Icon name="cloud_upload" className="text-lg" />
              Replace image
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-4 py-2 text-sm text-white hover:bg-white/10"
              disabled={busy}
              onClick={() => {
                onChange(null);
                setPreviewUrl(null);
                setPreviewError(false);
              }}
            >
              Remove
            </Button>
          </div>
        )}

        {hasPreview && dragActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/20 backdrop-blur-[1px]">
            <p className="font-body-emphasis text-secondary">Drop to replace image</p>
          </div>
        )}

        {uploadFile.isPending && (
          <div className="absolute inset-0 bg-surface/70 flex items-center justify-center z-10">
            <Spinner className="h-8 w-8 text-secondary" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        disabled={busy}
        onChange={(e) => void handleFileSelected(e.target.files?.[0])}
      />

      {allowPasteUrl && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <Input
            label="Or paste image URL"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://example.com/chai.jpg"
            className="flex-1"
            disabled={busy}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0 sm:mb-0.5"
            disabled={busy || !urlDraft.trim()}
            onClick={applyPastedUrl}
          >
            Use URL
          </Button>
        </div>
      )}

      {hint && <p className="font-caption text-on-surface-variant">{hint}</p>}
    </div>
  );
}
