'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Icon } from '@/components/ui';

type QrCodeStylingInstance = {
  append: (element: HTMLElement) => void;
  download: (options: { name: string; extension: 'png' | 'jpeg' | 'webp' | 'svg' }) => void;
  getRawData: (extension: 'png' | 'jpeg' | 'webp' | 'svg') => Promise<Blob | null>;
};

type BrandedQrCodeProps = {
  url: string;
  logoUrl?: string | null;
  label: string;
  size?: number;
};

function slugifyFilename(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function BrandedQrCode({ url, logoUrl, label, size = 220 }: BrandedQrCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QrCodeStylingInstance | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function mount() {
      const QRCodeStyling = (await import('qr-code-styling')).default;
      if (cancelled || !containerRef.current) return;

      containerRef.current.innerHTML = '';

      const qr = new QRCodeStyling({
        width: size,
        height: size,
        type: 'canvas',
        data: url,
        image: logoUrl || undefined,
        qrOptions: { errorCorrectionLevel: 'H' },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 8,
          imageSize: 0.34,
        },
        dotsOptions: {
          color: '#1a1c1c',
          type: 'rounded',
        },
        backgroundOptions: {
          color: '#ffffff',
        },
        cornersSquareOptions: {
          color: '#1a1c1c',
          type: 'extra-rounded',
        },
        cornersDotOptions: {
          color: '#62B4A7',
          type: 'dot',
        },
      }) as QrCodeStylingInstance;

      qr.append(containerRef.current);
      qrRef.current = qr;
      if (!cancelled) setReady(true);
    }

    setReady(false);
    mount();

    return () => {
      cancelled = true;
      qrRef.current = null;
    };
  }, [url, logoUrl, size]);

  const download = useCallback(async () => {
    const qr = qrRef.current;
    if (!qr) return;
    const name = slugifyFilename(label) || 'qr-code';
    await qr.download({ name, extension: 'png' });
  }, [label]);

  const print = useCallback(async () => {
    const qr = qrRef.current;
    if (!qr) return;

    const blob = await qr.getRawData('png');
    if (!blob) return;

    const imgUrl = URL.createObjectURL(blob);
    const win = window.open('', '_blank', 'width=480,height=640');
    if (!win) {
      URL.revokeObjectURL(imgUrl);
      return;
    }

    const safeLabel = label.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeUrl = url.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeLabel}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        font-family: system-ui, sans-serif;
        color: #111;
      }
      h1 { font-size: 20px; margin: 0 0 16px; text-align: center; }
      img { width: 280px; height: 280px; object-fit: contain; }
      p {
        margin: 14px 0 0;
        font-size: 11px;
        color: #666;
        max-width: 320px;
        text-align: center;
        word-break: break-all;
      }
    </style>
  </head>
  <body>
    <h1>${safeLabel}</h1>
    <img src="${imgUrl}" alt="QR code" />
    <p>${safeUrl}</p>
    <script>
      window.onload = function () {
        window.print();
        window.onafterprint = function () { window.close(); };
      };
    </script>
  </body>
</html>`);
    win.document.close();
    window.setTimeout(() => URL.revokeObjectURL(imgUrl), 60_000);
  }, [label, url]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        className="rounded-xl border border-outline-variant/20 bg-white p-3 shadow-sm flex items-center justify-center"
        style={{ width: size + 24, minHeight: size + 24 }}
        aria-label={`QR code for ${label}`}
      />
      {!ready && <p className="font-caption text-on-surface-variant">Generating QR code…</p>}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer text-xs px-3 py-1.5"
          disabled={!ready}
          onClick={() => void download()}
        >
          <Icon name="download" className="text-base" />
          Save
        </Button>
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer text-xs px-3 py-1.5"
          disabled={!ready}
          onClick={() => void print()}
        >
          <Icon name="print" className="text-base" />
          Print
        </Button>
      </div>
    </div>
  );
}
