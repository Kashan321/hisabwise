'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui';
import { saveTableContext } from '@/lib/cart-storage';
import { usePublicTable } from '@/lib/hooks/queries';

export default function TableQrPage({
  params,
}: {
  params: Promise<{ slug: string; tableIdentifier: string }>;
}) {
  const { slug, tableIdentifier } = use(params);
  const router = useRouter();
  const { data, isLoading, isError } = usePublicTable(slug, tableIdentifier);

  useEffect(() => {
    if (data?.table) {
      saveTableContext(slug, {
        tableId: data.table.id,
        tableIdentifier: data.table.tableIdentifier,
      });
      router.replace(`/${slug}/order`);
    }
  }, [data, slug, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Spinner className="h-8 w-8 text-secondary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-margin-mobile text-center">
        <h1 className="font-display-md text-primary mb-2">Table not found</h1>
        <p className="font-body-base text-on-surface-variant">
          Scan a valid table QR code or browse the counter menu.
        </p>
      </div>
    );
  }

  return null;
}
