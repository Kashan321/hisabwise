'use client';

import { useRef, useState } from 'react';
import { Button, Icon, Spinner } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { formatApiError } from '@/lib/api/errors';
import { ApiError } from '@/lib/api/client';
import {
  useDownloadMenuGallerySampleCsv,
  useImportMenuGalleryCsv,
} from '@/lib/hooks/mutations';
import { downloadCsv } from '@/lib/report-dates';
import { useToast } from '@/lib/toast';

export function MenuGalleryImportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadSample = useDownloadMenuGallerySampleCsv();
  const importCsv = useImportMenuGalleryCsv();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedCsv, setPastedCsv] = useState('');
  const [importErrors, setImportErrors] = useState<Array<{ lineNumber: number; message: string }>>(
    [],
  );

  async function handleDownloadSample() {
    try {
      const result = await downloadSample.mutateAsync();
      downloadCsv(result.csv, result.filename);
      toast.success('Sample CSV downloaded');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  }

  async function runImport(input: File | { csv: string }) {
    setImportErrors([]);
    try {
      const result = await importCsv.mutateAsync(input);
      toast.success(`Added ${result.import.created} gallery photo(s)`);
      setSelectedFile(null);
      setPastedCsv('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
    } catch (err) {
      const message = formatApiError(err);
      if (err instanceof ApiError && err.details && typeof err.details === 'object') {
        const errors = (err.details as { errors?: Array<{ lineNumber: number; message: string }> })
          .errors;
        if (errors?.length) setImportErrors(errors);
      }
      toast.error(message);
    }
  }

  async function handleImportFile() {
    if (!selectedFile) {
      toast.error('Choose a CSV file first');
      return;
    }
    await runImport(selectedFile);
  }

  async function handleImportPaste() {
    if (!pastedCsv.trim()) {
      toast.error('Paste CSV content first');
      return;
    }
    await runImport({ csv: pastedCsv });
  }

  function handleClose() {
    setSelectedFile(null);
    setPastedCsv('');
    setImportErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk import gallery photos"
      description="Upload images first (single add or platform upload), copy each storage key into image_url, then import."
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button
            type="button"
            variant="outline"
            disabled={!pastedCsv.trim() || importCsv.isPending}
            onClick={handleImportPaste}
          >
            {importCsv.isPending ? <Spinner className="h-4 w-4" /> : 'Import pasted CSV'}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!selectedFile || importCsv.isPending}
            onClick={handleImportFile}
          >
            {importCsv.isPending ? <Spinner className="h-4 w-4" /> : 'Import file'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 space-y-3">
          <p className="font-body-emphasis">1. Download sample CSV</p>
          <p className="font-caption text-on-surface-variant">
            Columns: <code className="font-mono text-xs">label</code>,{' '}
            <code className="font-mono text-xs">search_terms</code>,{' '}
            <code className="font-mono text-xs">image_url</code>,{' '}
            <code className="font-mono text-xs">display_order</code>,{' '}
            <code className="font-mono text-xs">active</code>. Use an uploaded storage key or a
            direct https URL in <code className="font-mono text-xs">image_url</code>.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadSample}
            disabled={downloadSample.isPending}
          >
            <Icon name="download" className="text-lg" />
            Download sample CSV
          </Button>
        </div>

        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 space-y-3">
          <p className="font-body-emphasis">2. Upload CSV file</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-container file:text-on-primary-container file:font-body-emphasis hover:file:opacity-90 cursor-pointer"
            onChange={(event) => {
              setImportErrors([]);
              setSelectedFile(event.target.files?.[0] ?? null);
            }}
          />
          {selectedFile && (
            <p className="font-caption text-on-surface-variant">
              Selected: <span className="font-body-emphasis">{selectedFile.name}</span>
            </p>
          )}
        </div>

        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 space-y-3">
          <p className="font-body-emphasis">Or paste CSV</p>
          <textarea
            value={pastedCsv}
            onChange={(e) => {
              setImportErrors([]);
              setPastedCsv(e.target.value);
            }}
            rows={8}
            placeholder="label,search_terms,image_url,display_order,active&#10;Chai,tea,menu-gallery/platform/....jpg,0,yes"
            className="w-full rounded-xl border border-outline-variant/25 bg-surface-container px-3 py-2 font-mono text-xs text-on-surface focus:ring-2 focus:ring-primary/20 outline-none resize-y min-h-[8rem]"
          />
        </div>

        {importErrors.length > 0 && (
          <div className="rounded-xl border border-error/30 bg-error/5 p-4 max-h-40 overflow-y-auto">
            <p className="font-body-emphasis text-error mb-2">Fix these rows and try again:</p>
            <ul className="space-y-1">
              {importErrors.map((error) => (
                <li key={`${error.lineNumber}-${error.message}`} className="font-caption text-error">
                  Line {error.lineNumber}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
