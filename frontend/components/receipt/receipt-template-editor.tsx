'use client';

import { Button, Input, Textarea } from '@/components/ui';
import {
  DEFAULT_RECEIPT_TEMPLATE,
  RECEIPT_LOGO_SIZE_PX_MAX,
  RECEIPT_LOGO_SIZE_PX_MIN,
  RECEIPT_CUSTOM_BLOCK_PLACEMENTS,
  RECEIPT_PLACEHOLDER_HINT,
  type ReceiptTemplate,
} from '@/lib/receipt/receipt-template';
import {
  DEFAULT_RECEIPT_LABELS,
  newCustomBlockId,
  type ReceiptCustomBlock,
  type ReceiptTemplateLabels,
} from '@/lib/receipt/receipt-format';

const CUSTOMER_VISIBILITY_FIELDS: {
  key: keyof ReceiptTemplate;
  label: string;
  hint?: string;
}[] = [
  { key: 'showLogo', label: 'Logo' },
  { key: 'showBusinessName', label: 'Business name' },
  { key: 'showAddress', label: 'Address' },
  { key: 'showPhone', label: 'Phone number(s)' },
  { key: 'showCopyBanner', label: 'Copy banner', hint: 'e.g. Customer Copy or UNPAID' },
  { key: 'showOrderNumber', label: 'Order number' },
  { key: 'showDateTime', label: 'Date and time' },
  { key: 'showTableAndOrderType', label: 'Table / service and order type' },
  { key: 'showOrderTaker', label: 'Waiter / order taker' },
  { key: 'showPromotion', label: 'Promotion name' },
  { key: 'showItemAmounts', label: 'Line amounts', hint: 'Hide for item names only' },
  { key: 'showTotals', label: 'Subtotal and total' },
  { key: 'showPayment', label: 'Payment section' },
  { key: 'showOrderNotes', label: 'Order notes' },
  { key: 'showBarcode', label: 'Barcode' },
  { key: 'showThanksMessage', label: 'Thank you message' },
  { key: 'showBrandLine', label: 'Brand line' },
  { key: 'showContactLine', label: 'Contact line' },
];

const LABEL_FIELDS: { key: keyof ReceiptTemplateLabels; label: string; hint?: string }[] = [
  { key: 'phonePrefix', label: 'Phone prefix', hint: 'Clear to show numbers only' },
  { key: 'tablePrefix', label: 'Table / service prefix' },
  { key: 'promotionPrefix', label: 'Promotion prefix' },
  { key: 'itemsColumn', label: 'Items column title', hint: 'Clear to hide header' },
  { key: 'amountColumn', label: 'Amount column title' },
  { key: 'notesHeading', label: 'Notes heading' },
  { key: 'paymentHeading', label: 'Split payment heading' },
  { key: 'paymentMethod', label: 'Payment method label' },
  { key: 'paid', label: 'Paid label' },
  { key: 'change', label: 'Change label' },
  { key: 'reference', label: 'Reference label' },
  { key: 'subtotal', label: 'Subtotal label' },
  { key: 'tax', label: 'Tax label' },
  { key: 'serviceCharge', label: 'Service charge label' },
  { key: 'deliveryCharge', label: 'Delivery charge label' },
  { key: 'discount', label: 'Discount label' },
  { key: 'total', label: 'Total label' },
  { key: 'dateTimeSeparator', label: 'Date/time separator' },
  { key: 'orderTakerSeparator', label: 'Order taker separator', hint: 'Between role and name' },
];

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

  function patchLabel(key: keyof ReceiptTemplateLabels, val: string) {
    onChange({
      ...value,
      labels: { ...value.labels, [key]: val },
    });
  }

  function resetLabels() {
    onChange({ ...value, labels: { ...DEFAULT_RECEIPT_LABELS } });
  }

  function updateBlock(index: number, patchBlock: Partial<ReceiptCustomBlock>) {
    const next = value.customBlocks.map((b, i) => (i === index ? { ...b, ...patchBlock } : b));
    onChange({ ...value, customBlocks: next });
  }

  function removeBlock(index: number) {
    onChange({ ...value, customBlocks: value.customBlocks.filter((_, i) => i !== index) });
  }

  function addBlock() {
    onChange({
      ...value,
      customBlocks: [
        ...value.customBlocks,
        {
          id: newCustomBlockId(),
          placement: 'after_items',
          text: '',
          enabled: true,
        },
      ],
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Logo size (px)"
          type="number"
          min={RECEIPT_LOGO_SIZE_PX_MIN}
          max={RECEIPT_LOGO_SIZE_PX_MAX}
          step={1}
          hint={`${RECEIPT_LOGO_SIZE_PX_MIN}–${RECEIPT_LOGO_SIZE_PX_MAX} px width on the receipt (not the 80mm paper setting).`}
          value={String(value.logoSizePx)}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') return;
            const n = Number(raw);
            if (!Number.isFinite(n)) return;
            patch(
              'logoSizePx',
              Math.min(
                RECEIPT_LOGO_SIZE_PX_MAX,
                Math.max(RECEIPT_LOGO_SIZE_PX_MIN, Math.round(n)),
              ),
            );
          }}
          onBlur={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n) || n < RECEIPT_LOGO_SIZE_PX_MIN) {
              patch('logoSizePx', DEFAULT_RECEIPT_TEMPLATE.logoSizePx);
            }
          }}
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

      <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low/40 p-4 space-y-3">
        <div>
          <h4 className="font-body-emphasis text-on-surface">Customer receipt — what to show</h4>
          <p className="font-caption text-on-surface-variant mt-1">
            Turn sections on or off on customer bills. The restaurant <strong>name</strong> and{' '}
            <strong>logo image</strong> come from each business profile (Settings) — use Logo /
            Business name here to show or hide them. Kitchen tickets are not affected by these
            toggles.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {CUSTOMER_VISIBILITY_FIELDS.map(({ key, label, hint }) => (
            <label
              key={key}
              className="flex items-start gap-2.5 rounded-lg border border-outline-variant/10 bg-white px-3 py-2.5 font-body-base cursor-pointer"
              title={hint}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0"
                checked={Boolean(value[key])}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
              />
              <span>
                <span className="font-body-emphasis block">{label}</span>
                {hint ? (
                  <span className="font-caption text-on-surface-variant">{hint}</span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant/15 p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="font-body-emphasis text-on-surface">Labels &amp; wording</h4>
            <p className="font-caption text-on-surface-variant mt-1">
              Change or remove printed labels. Clear a field to hide that label on the receipt.
            </p>
          </div>
          <Button type="button" variant="outline" disabled={disabled} onClick={resetLabels}>
            Reset labels
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {LABEL_FIELDS.map(({ key, label, hint }) => (
            <Input
              key={key}
              label={label}
              hint={hint}
              value={value.labels[key]}
              disabled={disabled}
              onChange={(e) => patchLabel(key, e.target.value)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant/15 p-4 space-y-3">
        <div>
          <h4 className="font-body-emphasis text-on-surface">Custom order-details layout</h4>
          <p className="font-caption text-on-surface-variant mt-1">
            Optional. One line per row. Use placeholders — leave empty to keep the default layout.
          </p>
          <p className="font-caption text-primary/90 mt-2 break-words">{RECEIPT_PLACEHOLDER_HINT}</p>
        </div>
        <Textarea
          label="Order details format"
          rows={4}
          value={value.customerMetaFormat}
          disabled={disabled}
          placeholder={'{orderNumber}\n{datetime}\n{table} | {orderType}\n{orderTaker}'}
          onChange={(e) => patch('customerMetaFormat', e.target.value)}
        />
      </div>

      <div className="space-y-4 rounded-xl border border-outline-variant/15 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-body-emphasis text-on-surface">Flexible content blocks</h4>
            <p className="font-caption text-on-surface-variant mt-1">
              Add text anywhere on the customer receipt. Supports placeholders and multiple lines.
            </p>
          </div>
          <Button type="button" variant="outline" disabled={disabled} onClick={addBlock}>
            Add block
          </Button>
        </div>

        {value.customBlocks.length === 0 ? (
          <p className="font-caption text-on-surface-variant">No extra blocks yet.</p>
        ) : (
          <div className="space-y-4">
            {value.customBlocks.map((block, index) => (
              <div
                key={block.id}
                className="rounded-lg border border-outline-variant/15 bg-surface-container-low/30 p-3 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 font-caption">
                    <input
                      type="checkbox"
                      checked={block.enabled}
                      disabled={disabled}
                      onChange={(e) => updateBlock(index, { enabled: e.target.checked })}
                    />
                    Enabled
                  </label>
                  <label className="flex flex-col gap-1 font-caption min-w-[180px]">
                    <span className="font-body-emphasis">Placement</span>
                    <select
                      className="rounded-lg border border-outline-variant/30 bg-white px-2 py-1.5"
                      value={block.placement}
                      disabled={disabled}
                      onChange={(e) =>
                        updateBlock(index, {
                          placement: e.target.value as ReceiptCustomBlock['placement'],
                        })
                      }
                    >
                      {RECEIPT_CUSTOM_BLOCK_PLACEMENTS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    className="ml-auto text-error"
                    disabled={disabled}
                    onClick={() => removeBlock(index)}
                  >
                    Remove
                  </Button>
                </div>
                <Textarea
                  label="Content"
                  rows={3}
                  value={block.text}
                  disabled={disabled}
                  placeholder="Wi‑Fi: CafeGuest / {total}"
                  onChange={(e) => updateBlock(index, { text: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}

        <Textarea
          label="Legacy: after header (simple text)"
          rows={2}
          value={value.customTextTop}
          disabled={disabled}
          onChange={(e) => patch('customTextTop', e.target.value)}
        />
        <Textarea
          label="Legacy: before footer (simple text)"
          rows={2}
          value={value.customTextBottom}
          disabled={disabled}
          onChange={(e) => patch('customTextBottom', e.target.value)}
        />
      </div>
    </div>
  );
}
