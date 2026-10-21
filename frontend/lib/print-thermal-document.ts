/** Shared 80mm / 58mm thermal document printing (receipts, reports, etc.). */

export type ThermalWidthMm = 58 | 80;

export const THERMAL_WIDTH_MM: ThermalWidthMm = 80;

export interface ThermalStatRow {
  label: string;
  value: string;
}

export interface ThermalTableSection {
  heading?: string;
  headers: string[];
  rows: string[][];
  truncatedCount?: number;
}

export interface ThermalDocumentOptions {
  title: string;
  subtitle?: string;
  rangeLabel?: string;
  businessName?: string;
  businessLocation?: string | null;
  printedAt?: Date;
  widthMm?: ThermalWidthMm;
  stats?: ThermalStatRow[];
  tables?: ThermalTableSection[];
  footerLines?: string[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rowHtml(left: string, right: string, className = 'row'): string {
  return `<div class="${className}"><span class="col-left">${left}</span><span class="col-right">${right}</span></div>`;
}

function buildThermalStyles(widthMm: number): string {
  const compact = widthMm <= 58;
  const base = compact ? 11 : 12;
  const sm = compact ? 10 : 11;
  const md = compact ? 12 : 13;
  const lg = compact ? 14 : 16;

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${widthMm}mm;
      max-width: ${widthMm}mm;
      min-width: ${widthMm}mm;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: "Courier New", Courier, monospace;
      background: #fff;
      color: #000;
      font-weight: 700;
      font-size: ${base}px;
      line-height: 1.4;
    }
    .doc {
      width: ${widthMm}mm;
      padding: 3mm 2.5mm 2mm;
      background: #fff;
    }
    .center { text-align: center; }
    .doc-title {
      font-size: ${lg}px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }
    .doc-subtitle, .doc-range, .doc-business, .doc-meta {
      font-size: ${sm}px;
      font-weight: 700;
      line-height: 1.3;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    .doc-meta { margin-top: 2px; }
    .rule {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    .rule.strong {
      border-top: 2px solid #000;
      margin: 6px 0 4px;
    }
    .section-heading {
      font-size: ${sm}px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin: 4px 0 3px;
    }
    .row, .stat-row, .table-head, .table-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 4px;
      width: 100%;
    }
    .col-left {
      flex: 1;
      min-width: 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .col-right {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
      max-width: 42%;
    }
    .table-row .col-left {
      padding-right: 3px;
      word-break: normal;
      white-space: pre-line;
      line-height: 1.25;
    }
    .stat-row {
      font-size: ${base}px;
      margin-bottom: 1px;
    }
    .table-head {
      font-size: ${sm}px;
      font-weight: 800;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
      margin-bottom: 2px;
    }
    .table-row {
      font-size: ${base}px;
      padding: 2px 0;
      border-bottom: 1px dotted #000;
    }
    .table-row:last-child { border-bottom: none; }
    .table-row .col-left { font-weight: 800; }
    .truncated-note {
      font-size: ${sm}px;
      font-style: italic;
      margin-top: 3px;
      text-align: center;
    }
    .footer {
      margin-top: 6px;
      text-align: center;
      font-size: ${sm}px;
      line-height: 1.3;
    }
    @page { size: ${widthMm}mm auto; margin: 0; }
    @media print {
      html, body {
        width: ${widthMm}mm !important;
        max-width: ${widthMm}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      .doc {
        width: ${widthMm}mm !important;
        padding: 2mm 2.5mm 1mm !important;
      }
    }
  `;
}

function buildPrintScript(widthMm: number): string {
  return `<script>
    (function () {
      function applyPageSize() {
        var doc = document.querySelector('.doc');
        if (!doc) return;
        var heightMm = Math.max(Math.ceil((doc.scrollHeight * 25.4) / 96) + 1, 40);
        var style = document.getElementById('dynamic-page-size');
        if (!style) {
          style = document.createElement('style');
          style.id = 'dynamic-page-size';
          document.head.appendChild(style);
        }
        style.textContent = '@page { size: ${widthMm}mm ' + heightMm + 'mm; margin: 0; }';
      }
      function runPrint() {
        applyPageSize();
        window.focus();
        window.print();
      }
      if (document.readyState === 'complete') setTimeout(runPrint, 120);
      else window.addEventListener('load', function () { setTimeout(runPrint, 120); }, { once: true });
      window.addEventListener('beforeprint', applyPageSize, { once: true });
    })();
  </script>`;
}

function buildStatsHtml(stats: ThermalStatRow[]): string {
  if (!stats.length) return '';
  return `
    <section>
      ${stats.map((s) => rowHtml(escapeHtml(s.label), escapeHtml(s.value), 'stat-row')).join('')}
    </section>
    <div class="rule"></div>`;
}

function buildTableHtml(table: ThermalTableSection): string {
  const heading = table.heading
    ? `<div class="section-heading">${escapeHtml(table.heading)}</div>`
    : '';
  const headerLeft = escapeHtml(table.headers[0] ?? '');
  const headerRight =
    table.headers.length > 1
      ? escapeHtml(table.headers[table.headers.length - 1] ?? '')
      : '';
  const rows = table.rows
    .map((row) => {
      if (row.length <= 1) {
        return rowHtml(escapeHtml(String(row[0] ?? '')), '', 'table-row');
      }
      const right = escapeHtml(String(row[row.length - 1] ?? ''));
      const left = escapeHtml(row.slice(0, -1).join(' · '));
      return rowHtml(left, right, 'table-row');
    })
    .join('');
  const truncated = table.truncatedCount
    ? `<div class="truncated-note">+ ${table.truncatedCount} more not shown</div>`
    : '';

  return `
    <section>
      ${heading}
      <div class="table-head">
        <span class="col-left">${headerLeft}</span>
        <span class="col-right">${headerRight}</span>
      </div>
      ${rows}
      ${truncated}
    </section>
    <div class="rule"></div>`;
}

export function renderThermalDocumentHtml(
  options: ThermalDocumentOptions,
  autoPrint = false,
): string {
  const widthMm = options.widthMm ?? THERMAL_WIDTH_MM;
  const printedAt = options.printedAt ?? new Date();
  const dateStr = printedAt.toLocaleDateString(undefined, { dateStyle: 'medium' });
  const timeStr = printedAt.toLocaleTimeString(undefined, { timeStyle: 'short' });

  const header = `
    <header class="center">
      ${options.businessName ? `<div class="doc-business">${escapeHtml(options.businessName)}</div>` : ''}
      ${options.businessLocation?.trim() ? `<div class="doc-business">${escapeHtml(options.businessLocation.trim())}</div>` : ''}
      <div class="doc-title">${escapeHtml(options.title)}</div>
      ${options.subtitle ? `<div class="doc-subtitle">${escapeHtml(options.subtitle)}</div>` : ''}
      ${options.rangeLabel ? `<div class="doc-range">${escapeHtml(options.rangeLabel)}</div>` : ''}
      <div class="doc-meta">Printed: ${escapeHtml(dateStr)} · ${escapeHtml(timeStr)}</div>
    </header>
    <div class="rule strong"></div>`;

  const stats = options.stats?.length ? buildStatsHtml(options.stats) : '';
  const tables = (options.tables ?? []).map(buildTableHtml).join('');
  const footer = options.footerLines?.length
    ? `<footer class="footer">${options.footerLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('')}</footer>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${widthMm}mm, initial-scale=1" />
  <title>${escapeHtml(options.title)}</title>
  <style>${buildThermalStyles(widthMm)}</style>
</head>
<body>
  <div class="doc">
    ${header}
    ${stats}
    ${tables}
    ${footer}
  </div>
  ${autoPrint ? buildPrintScript(widthMm) : ''}
</body>
</html>`;
}

export function printThermalDocument(options: ThermalDocumentOptions): void {
  const widthMm = options.widthMm ?? THERMAL_WIDTH_MM;
  const html = renderThermalDocumentHtml(options, true);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Thermal print');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${widthMm}mm;height:auto;border:0;visibility:hidden;`;

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    window.setTimeout(() => iframe.remove(), 200);
  };

  document.body.appendChild(iframe);
  const frameWindow = iframe.contentWindow;
  const frameDocument = frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    throw new Error('Unable to prepare document for printing.');
  }

  frameWindow.onafterprint = cleanup;
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
  window.setTimeout(cleanup, 4000);
}
