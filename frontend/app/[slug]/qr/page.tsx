'use client';

import { use, useEffect, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { BrandedQrCode } from '@/components/qr/branded-qr-code';
import { Button, Icon } from '@/components/ui';
import { PageHeader } from '@/components/ui/page-shell';
import { useBusiness, useCounterQr, useFloorTables, useTableQr } from '@/lib/hooks/queries';
import { useToast } from '@/lib/toast';

function useBrowserOrigin() {
  const [origin, setOrigin] = useState('');
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  return origin;
}

function toBrowserUrl(origin: string, url: string) {
  if (!origin) return url;
  try {
    const { pathname, search } = new URL(url);
    return `${origin}${pathname}${search}`;
  } catch {
    return url;
  }
}

function QrCard({
  title,
  url,
  subtitle,
  logoUrl,
}: {
  title: string;
  url: string;
  subtitle?: string;
  logoUrl?: string | null;
}) {
  const toast = useToast();

  function copy() {
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  }

  return (
    <div className="p-5 border border-outline-variant/20 rounded-xl bg-surface-container-lowest h-full flex flex-col">
      <div className="flex flex-col items-center text-center gap-4 flex-1">
        <BrandedQrCode url={url} logoUrl={logoUrl} label={title} size={180} />

        <div className="w-full space-y-2">
          <div>
            <p className="font-body-emphasis text-primary">{title}</p>
            {subtitle && <p className="font-caption text-on-surface-variant mt-1">{subtitle}</p>}
          </div>
          <p className="font-mono text-[11px] leading-relaxed break-all text-on-surface-variant bg-surface-container-low p-2.5 rounded-lg text-center">
            {url}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-center pt-4 mt-auto border-t border-outline-variant/10">
        <Button type="button" variant="outline" onClick={copy} className="cursor-pointer">
          <Icon name="content_copy" />
          Copy
        </Button>
        <a href={url} target="_blank" rel="noreferrer">
          <Button type="button" variant="primary" className="cursor-pointer">
            <Icon name="open_in_new" />
            Open
          </Button>
        </a>
      </div>
    </div>
  );
}

function TableQrRow({
  tableId,
  label,
  logoUrl,
  origin,
}: {
  tableId: string;
  label: string;
  logoUrl?: string | null;
  origin: string;
}) {
  const { data: qr, isLoading } = useTableQr(tableId);
  if (isLoading) {
    return (
      <div className="p-5 border border-outline-variant/20 rounded-xl bg-surface-container-lowest">
        <p className="font-caption text-on-surface-variant text-center">Loading {label}…</p>
      </div>
    );
  }
  if (!qr) return null;
  const url = toBrowserUrl(origin, qr.url);
  return (
    <QrCard
      title={`Table ${label}`}
      url={url}
      subtitle="Scan to order from this table"
      logoUrl={logoUrl}
    />
  );
}

export default function QrCodesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const origin = useBrowserOrigin();
  const { data: business } = useBusiness();
  const { data: counterQr, isLoading: counterLoading } = useCounterQr();
  const { data: tables = [], isLoading: tablesLoading } = useFloorTables();
  const [showTables, setShowTables] = useState(true);
  const menuUrl = origin ? `${origin}/${slug}/order` : `/${slug}/order`;
  const logoUrl = business?.logoUrl ?? null;

  const counterUrl = counterQr ? toBrowserUrl(origin, counterQr.url) : null;

  return (
    <BusinessLayout slug={slug}>
      <PageHeader
        icon="qr_code_2"
        title="QR Codes"
        description="Generate branded QR codes for your menu and tables. Save or print them for your cafe."
      />

      <section className="rounded-2xl border-2 border-outline-variant/10 bg-white overflow-hidden shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-outline-variant/20">
          <h3 className="font-title-lg text-primary">Menu QR codes</h3>
          <p className="font-caption text-on-surface-variant mt-1">
            Counter ordering and public menu links
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {counterLoading ? (
            <p className="font-caption text-on-surface-variant md:col-span-2">Loading counter QR…</p>
          ) : counterUrl ? (
            <QrCard
              title="Counter / pickup menu"
              url={counterUrl}
              subtitle="No table assigned — general ordering"
              logoUrl={logoUrl}
            />
          ) : null}
          <QrCard title="Menu browse" url={menuUrl} subtitle="Public customer menu" logoUrl={logoUrl} />
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-xl card-hairline overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
          <h3 className="font-title-lg text-primary">Table QR codes</h3>
          <Button type="button" variant="ghost" onClick={() => setShowTables((s) => !s)}>
            {showTables ? 'Collapse' : 'Expand'}
          </Button>
        </div>
        {tablesLoading && <p className="font-caption p-4">Loading tables…</p>}
        {showTables && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {tables.length === 0 && (
              <p className="font-caption text-on-surface-variant md:col-span-2">
                Add tables on the Floor Plan first, then generate table QR links here.
              </p>
            )}
            {tables.map((t) => (
              <TableQrRow
                key={t.id}
                tableId={t.id}
                label={t.tableIdentifier}
                logoUrl={logoUrl}
                origin={origin}
              />
            ))}
          </div>
        )}
      </section>
    </BusinessLayout>
  );
}
