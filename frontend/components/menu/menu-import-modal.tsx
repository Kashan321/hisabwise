'use client';

import { useRef, useState } from 'react';
import { Button, Icon, Spinner } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { formatApiError } from '@/lib/api/errors';
import { ApiError } from '@/lib/api/client';
import { useDownloadMenuSampleCsv, useImportMenuCsv } from '@/lib/hooks/mutations';
import { downloadCsv } from '@/lib/report-dates';
import { useToast } from '@/lib/toast';

export function MenuImportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadSample = useDownloadMenuSampleCsv();
  const importCsv = useImportMenuCsv();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  async function handleImport() {
    if (!selectedFile) {
      toast.error('Choose a CSV file first');
      return;
    }

    setImportErrors([]);
    try {
      const result = await importCsv.mutateAsync(selectedFile);
      const stats = result.import;
      toast.success(
        `Imported ${stats.itemsCreated} items, ${stats.variantsCreated} variants, ${stats.modifierOptionsCreated} modifier options`,
      );
      setSelectedFile(null);
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

  function handleClose() {
    setSelectedFile(null);
    setImportErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import menu from CSV"
      description="Download the sample file, fill in your menu, then upload it here."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!selectedFile || importCsv.isPending}
            onClick={handleImport}
          >
            {importCsv.isPending ? (
              <>
                <Spinner className="h-4 w-4" /> Importing…
              </>
            ) : (
              'Import CSV'
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 space-y-3">
          <p className="font-body-emphasis">1. Download sample CSV</p>
          <p className="font-caption text-on-surface-variant">
            Includes examples for simple items, sizes/variants, and modifier groups (crust,
            toppings).
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
          <p className="font-body-emphasis">2. Upload your CSV</p>
          <p className="font-caption text-on-surface-variant">
            Keep the header row unchanged. Use one row per variant or modifier option.
          </p>
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
