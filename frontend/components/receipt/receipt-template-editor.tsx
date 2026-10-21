'use client';

import { Input } from '@/components/ui';
import type { ReceiptTemplate } from '@/lib/receipt/receipt-template';

export function ReceiptTemplateEditor({
  value,
  onChange,
  disabled,
}: {
  value: ReceiptTemplate;
  onChange: (next: ReceiptTemplate) => void;
  disabled?: boolean;
}) {
  function patch<K extends keyof ReceiptTemplate>(key: K, val: ReceiptTemplate[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Logo size (px)"
          type="number"
          min={32}
          max={80}
          value={String(value.logoSizePx)}
          disabled={disabled}
          onChange={(e) => patch('logoSizePx', Number(e.target.value) || 42)}
        />
        <label className="flex flex-col gap-2 font-body-base">
          <span className="font-body-emphasis">Receipt width</span>
          <select
            className="rounded-xl border border-outline-variant/30 bg-surface px-3 py-2.5"
            value={value.receiptWidthMm}
            disabled={disabled}
            onChange={(e) => patch('receiptWidthMm', Number(e.target.value) as 58 | 80)}
          >
            <option value={80}>80mm (standard)</option>
            <option value={58}>58mm (compact)</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Customer copy label"
          value={value.customerCopyLabel}
          disabled={disabled}
          onChange={(e) => patch('customerCopyLabel', e.target.value)}
        />
        <Input
          label="Kitchen copy label"
          value={value.kitchenCopyLabel}
          disabled={disabled}
          onChange={(e) => patch('kitchenCopyLabel', e.target.value)}
        />
      </div>

      <Input
        label="Thank you message"
        value={value.thanksMessage}
        disabled={disabled}
        onChange={(e) => patch('thanksMessage', e.target.value)}
      />
      <Input
        label="Brand line"
        value={value.brandLine}
        disabled={disabled}
        onChange={(e) => patch('brandLine', e.target.value)}
      />
      <Input
        label="Contact line"
        value={value.contactLine}
        disabled={disabled}
        onChange={(e) => patch('contactLine', e.target.value)}
      />

      <label className="flex items-center gap-3 font-body-base">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={value.showBarcode}
          disabled={disabled}
          onChange={(e) => patch('showBarcode', e.target.checked)}
        />
        Show barcode on customer receipts
      </label>
    </div>
  );
}
