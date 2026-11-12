import type { Order, OrderPayment } from '@/lib/api/types';
import { buildCode128Svg } from '@/lib/barcode-code128';
import { DEFAULT_CURRENCY } from '@/lib/currencies';
import { isOrderPaidForReceipt, paymentMethodLabel } from '@/lib/payment-methods';
import { formatCurrency } from '@/lib/format-currency';
import { formatRestaurantReceiptPhones } from '@/lib/business-phones';
import { APP_NAME } from '@/lib/config';
import { resolveKitchenServiceLine } from '@/lib/kitchen-order-label';
import {
  formatOrderLabel,
  formatOrderShortLabel,
  orderTakerReceiptLabel,
} from '@/lib/order-display';
import {
  formatOrderItemReceiptQtyLine,
  formatOrderItemWeightLine,
} from '@/lib/order-item-display';
import {
  buildReceiptPlaceholderContext,
  interpolateReceiptText,
  normalizeCustomBlocks,
  renderFormatLines,
  type ReceiptCustomBlockPlacement,
  type ReceiptPlaceholderContext,
} from '@/lib/receipt/receipt-format';
import {
  DEFAULT_RECEIPT_TEMPLATE,
  mergeReceiptTemplate,
  type ReceiptTemplate,
} from '@/lib/receipt/receipt-template';

export type ReceiptCopyType = 'customer' | 'kitchen';
export type ReceiptWidthMm = 58 | 80;

/** Default thermal receipt roll width used by most POS printers. */
export const RECEIPT_WIDTH_MM: ReceiptWidthMm = 80;

export interface PrintReceiptOptions {
  tableLabel: string;
  /** Optional floor-plan lookup when order.tableIdentifier is missing (kitchen print). */
  tableMap?: Record<string, string>;
  businessName?: string;
  businessLocation?: string | null;
  businessPhone?: string | null;
  businessPhoneSecondary?: string | null;
  businessLogoUrl?: string | null;
  copyType?: ReceiptCopyType;
  currency?: string;
  receiptTemplate?: ReceiptTemplate;
  /** Thermal roll width in millimetres. Supports 58mm and 80mm rolls. */
  receiptWidthMm?: ReceiptWidthMm;
}

function resolveReceiptTemplate(options: PrintReceiptOptions): ReceiptTemplate {
  return mergeReceiptTemplate(DEFAULT_RECEIPT_TEMPLATE, options.receiptTemplate ?? {});
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: 'Dine-In',
  TAKEAWAY: 'Takeaway',
  DELIVERY: 'Delivery',
  QR: 'QR',
};

const UNPAID_RECEIPT_BANNER = '***UNPAID***';

function copyTypeLabel(
  copyType: ReceiptCopyType,
  template: ReceiptTemplate,
  order: Order,
): string {
  if (copyType === 'kitchen') return template.kitchenCopyLabel;
  if (!isOrderPaidForReceipt(order)) return UNPAID_RECEIPT_BANNER;
  return template.customerCopyLabel;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(value: string | number | undefined | null, currency = DEFAULT_CURRENCY): string {
  return formatCurrency(value, currency);
}

function amount(value: string | number | undefined | null): string {
  return Number(value ?? 0).toFixed(2);
}

function formatReceiptDateTime(iso: string): { date: string; time: string } {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString(undefined, { dateStyle: 'medium' }),
    time: date.toLocaleTimeString(undefined, { timeStyle: 'short' }),
  };
}

function formatKitchenReceiptDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-PK', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

function kitchenTicketNumber(order: Order): string {
  return formatOrderShortLabel(order).replace(/^#/, '');
}

function orderTypeLabel(order: Order): string {
  if (order.orderType) {
    return ORDER_TYPE_LABELS[order.orderType] ?? order.orderType.replace(/_/g, ' ');
  }
  return order.source === 'QR_CUSTOMER' ? 'QR' : 'Staff Order';
}

function formatOrderNumber(order: Order): string {
  const label = formatOrderLabel(order);
  return label.startsWith('#') ? label.toUpperCase() : label;
}

function rowHtml(left: string, right: string, className = 'row'): string {
  return `<div class="${className}"><span class="col-left">${left}</span><span class="col-right">${right}</span></div>`;
}

function buildKitchenItemsHtml(order: Order): string {
  const items = order.items ?? [];
  if (!items.length) {
    return '<div class="empty-items">No items</div>';
  }

  return items
    .map((item) => {
      const modifiers = (item.modifiers ?? [])
        .map(
          (mod) =>
            `<div class="sub-line modifier-row">+ ${escapeHtml(mod.modifierName)}</div>`,
        )
        .join('');

      const variantLine = item.variantName
        ? `<div class="sub-line">${escapeHtml(item.variantName)}</div>`
        : '';

      const weightLine = formatOrderItemWeightLine(item)
        ? `<div class="sub-line kitchen-weight">${escapeHtml(formatOrderItemWeightLine(item)!)}</div>`
        : '';

      const notes = item.customizationNotes
        ? `<div class="sub-line note">${escapeHtml(item.customizationNotes)}</div>`
        : '';

      return `
        <div class="kitchen-item-group">
          <div class="kitchen-item-line">
            <span class="kitchen-item-qty">${item.quantity}x</span>
            <span class="kitchen-item-name">${escapeHtml(item.menuItemName)}</span>
          </div>
          ${variantLine}
          ${weightLine}
          ${modifiers}
          ${notes}
          <div class="kitchen-rule-solid"></div>
        </div>`;
    })
    .join('');
}

function buildItemsHtml(order: Order, showAmounts = true): string {
  const items = order.items ?? [];
  if (!items.length) {
    return '<div class="empty-items">No items</div>';
  }

  return items
    .map((item) => {
      const qtyLine = escapeHtml(
        formatOrderItemReceiptQtyLine(item, (n) => amount(n)),
      );

      const modifiers = (item.modifiers ?? [])
        .map((mod) => {
          const modPrice = Number(mod.priceAdjustment ?? 0);
          const priceCell =
            showAmounts && modPrice !== 0 ? amount(mod.priceAdjustment) : '';
          return rowHtml(
            `+ ${escapeHtml(mod.modifierName)}`,
            priceCell,
            'modifier-row',
          );
        })
        .join('');

      const notes = item.customizationNotes
        ? `<div class="sub-line note">${escapeHtml(item.customizationNotes)}</div>`
        : '';

      const nameRow = showAmounts
        ? rowHtml(escapeHtml(item.menuItemName), amount(item.lineTotal), 'item-row')
        : `<div class="item-row item-row--name-only">${escapeHtml(item.menuItemName)}</div>`;

      return `
        <div class="item">
          ${nameRow}
          <div class="sub-line qty-line">${qtyLine}</div>
          ${modifiers}
          ${notes}
        </div>`;
    })
    .join('');
}

function buildTotalsHtml(order: Order, currency: string, template: ReceiptTemplate): string {
  const labels = template.labels;
  const discount = Number(order.discountAmount ?? 0);
  const tax = Number(order.taxAmount ?? 0);
  const service = Number(order.serviceAmount ?? 0);
  const delivery = Number(order.deliveryAmount ?? 0);

  const lines = [
    ...(tax > 0 && labels.tax ? [rowHtml(labels.tax, money(tax, currency))] : []),
    ...(service > 0 && labels.serviceCharge
      ? [rowHtml(labels.serviceCharge, money(service, currency))]
      : []),
    ...(delivery > 0 && labels.deliveryCharge
      ? [rowHtml(labels.deliveryCharge, money(delivery, currency))]
      : []),
    ...(discount > 0 && labels.discount
      ? [rowHtml(labels.discount, `-${money(discount, currency)}`)]
      : []),
    ...(labels.subtotal ? [rowHtml(labels.subtotal, money(order.subtotal, currency))] : []),
  ];

  const totalLabel = labels.total
    ? `<span class="grand-label">${escapeHtml(labels.total)}</span>`
    : '<span class="grand-label">TOTAL</span>';

  return `
    <div class="totals">
      <div class="rule"></div>
      ${lines.join('')}
      <div class="rule"></div>
      ${rowHtml(totalLabel, `<span class="grand-amount">${money(order.totalAmount, currency)}</span>`, 'total-row grand')}
      <div class="rule strong"></div>
    </div>`;
}

function buildPaymentHtml(order: Order, currency: string, template: ReceiptTemplate): string {
  const labels = template.labels;
  const payments = order.payments ?? [];

  if (!payments.length) {
    if (!order.paymentMethod) return '';
    return `
      <div class="payment-section">
        ${labels.paymentMethod ? rowHtml(labels.paymentMethod, escapeHtml(paymentMethodLabel(order.paymentMethod).toUpperCase())) : ''}
        ${labels.paid ? rowHtml(labels.paid, money(order.totalAmount, currency)) : ''}
      </div>`;
  }

  if (payments.length === 1) {
    return buildSinglePaymentHtml(payments[0], currency, template);
  }

  const lines = payments.map((payment) =>
    rowHtml(
      escapeHtml(paymentMethodLabel(payment.method).toUpperCase()),
      money(payment.amount, currency),
    ),
  );

  return `
    <div class="payment-section">
      ${labels.paymentHeading ? `<div class="section-heading">${escapeHtml(labels.paymentHeading)}</div>` : ''}
      ${lines.join('')}
    </div>`;
}

function buildSinglePaymentHtml(
  payment: OrderPayment,
  currency: string,
  template: ReceiptTemplate,
): string {
  const labels = template.labels;
  const paidAmount =
    payment.amountReceived != null ? Number(payment.amountReceived) : Number(payment.amount);
  const changeAmount =
    payment.changeGiven != null
      ? Number(payment.changeGiven)
      : Math.max(0, Math.round((paidAmount - Number(payment.amount)) * 100) / 100);

  const lines = [
    ...(labels.paymentMethod
      ? [rowHtml(labels.paymentMethod, escapeHtml(paymentMethodLabel(payment.method).toUpperCase()))]
      : []),
    ...(labels.paid ? [rowHtml(labels.paid, money(paidAmount, currency))] : []),
    ...(changeAmount > 0 && labels.change
      ? [rowHtml(labels.change, money(changeAmount, currency))]
      : []),
    ...(payment.referenceNumber && labels.reference
      ? [rowHtml(labels.reference, escapeHtml(payment.referenceNumber))]
      : []),
  ];

  return `<div class="payment-section">${lines.join('')}</div>`;
}

function buildKitchenHeaderHtml(order: Order, serviceLine: string): string {
  const { date, time } = formatKitchenReceiptDateTime(order.createdAt);
  const taker = orderTakerReceiptLabel(order);

  return `
    <div class="kitchen-hero-number">${escapeHtml(kitchenTicketNumber(order))}</div>
    <div class="kitchen-service">${escapeHtml(serviceLine)}</div>
    <div class="kitchen-datetime meta-row">
      <span class="col-left">${escapeHtml(date)}</span>
      <span class="col-right">${escapeHtml(time)}</span>
    </div>
    ${
      taker
        ? `<div class="kitchen-server meta-line">${escapeHtml(taker.label)}: ${escapeHtml(taker.name)}</div>`
        : ''
    }
    ${
      order.notes
        ? `<div class="kitchen-order-note meta-line note">${escapeHtml(order.notes)}</div>`
        : ''
    }`;
}

function buildCustomTextBlock(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<div class="custom-text-line">${escapeHtml(line)}</div>`)
    .join('');
  return `<div class="custom-receipt-block">${lines}</div>`;
}

function orderTakerPlainLine(order: Order, template: ReceiptTemplate): string {
  const taker = orderTakerReceiptLabel(order);
  if (!taker) return '';
  return `${taker.label}${template.labels.orderTakerSeparator}${taker.name}`;
}

function applyPlaceholderVisibility(
  template: ReceiptTemplate,
  ctx: ReceiptPlaceholderContext,
): ReceiptPlaceholderContext {
  const next = { ...ctx };
  if (!template.showBusinessName) next.businessName = '';
  if (!template.showAddress) next.address = '';
  if (!template.showPhone) next.phone = '';
  if (!template.showOrderNumber) next.orderNumber = '';
  if (!template.showDateTime) {
    next.date = '';
    next.time = '';
    next.datetime = '';
  }
  if (!template.showTableAndOrderType) {
    next.table = '';
    next.orderType = '';
  }
  if (!template.showOrderTaker) next.orderTaker = '';
  if (!template.showPromotion) next.promotion = '';
  if (!template.showOrderNotes) next.notes = '';
  if (!template.showTotals) {
    next.subtotal = '';
    next.total = '';
  }
  if (!template.showCopyBanner) next.copyBanner = '';
  return next;
}

function buildReceiptContext(
  order: Order,
  template: ReceiptTemplate,
  input: {
    tableLabel: string;
    businessName: string;
    addressLine: string;
    phoneLine: string;
    copyBanner: string;
    currency: string;
  },
): ReceiptPlaceholderContext {
  const { date, time } = formatReceiptDateTime(order.createdAt);
  const ctx = buildReceiptPlaceholderContext({
    order,
    template,
    tableLabel: input.tableLabel,
    businessName: input.businessName,
    addressLine: input.addressLine,
    phoneLine: input.phoneLine,
    copyBanner: input.copyBanner,
    currency: input.currency,
    formatOrderNumber,
    orderTypeLabel,
    orderTakerLine: (o) => orderTakerPlainLine(o, template),
    formatDate: () => date,
    formatTime: () => time,
    formatMoney: (v) => money(v, input.currency),
  });
  return applyPlaceholderVisibility(template, ctx);
}

function renderCustomBlocksHtml(
  placement: ReceiptCustomBlockPlacement,
  template: ReceiptTemplate,
  ctx: ReceiptPlaceholderContext,
): string {
  return normalizeCustomBlocks(template.customBlocks)
    .filter((block) => block.placement === placement)
    .map((block) => buildCustomTextBlock(interpolateReceiptText(block.text, ctx)))
    .join('');
}

function buildOrderMetaHtml(
  order: Order,
  tableLabel: string,
  copyType: ReceiptCopyType,
  template: ReceiptTemplate,
  ctx: ReceiptPlaceholderContext,
): string {
  if (copyType === 'kitchen') {
    return buildKitchenHeaderHtml(order, tableLabel);
  }

  const customFormat = template.customerMetaFormat.trim();
  if (customFormat) {
    return renderFormatLines(customFormat, ctx)
      .map((line) => `<div class="meta-line">${escapeHtml(line)}</div>`)
      .join('');
  }

  const { date, time } = formatReceiptDateTime(order.createdAt);
  const taker = orderTakerReceiptLabel(order);
  const labels = template.labels;
  const sep = labels.dateTimeSeparator || ' • ';

  const lines: string[] = [];

  if (template.showOrderNumber) {
    lines.push(`<div class="order-id">${escapeHtml(formatOrderNumber(order))}</div>`);
  }
  if (template.showDateTime) {
    lines.push(
      `<div class="order-datetime">${escapeHtml(date)}${escapeHtml(sep)}${escapeHtml(time)}</div>`,
    );
  }
  if (template.showTableAndOrderType) {
    const tableLeft =
      labels.tablePrefix === ''
        ? escapeHtml(tableLabel)
        : `${escapeHtml(labels.tablePrefix)} ${escapeHtml(tableLabel)}`;
    lines.push(rowHtml(tableLeft, escapeHtml(orderTypeLabel(order)), 'meta-row'));
  }

  if (template.showOrderTaker && taker) {
    lines.push(
      `<div class="meta-line">${escapeHtml(taker.label)}${escapeHtml(labels.orderTakerSeparator)}${escapeHtml(taker.name)}</div>`,
    );
  }
  if (template.showPromotion && order.promotionTitle) {
    const promoLine =
      labels.promotionPrefix === ''
        ? escapeHtml(order.promotionTitle)
        : `${escapeHtml(labels.promotionPrefix)} ${escapeHtml(order.promotionTitle)}`;
    lines.push(`<div class="meta-line">${promoLine}</div>`);
  }

  return lines.join('');
}

function buildDeliveryCustomerHtml(order: Order, copyType: ReceiptCopyType): string {
  if (copyType === 'kitchen' || order.orderType !== 'DELIVERY') return '';

  const name = order.customerName?.trim();
  const phone = order.customerPhone?.trim();
  const address = order.deliveryAddress?.trim();
  const notes = order.deliveryNotes?.trim();
  if (!name && !phone && !address && !notes) return '';

  const lines: string[] = [];
  if (name) {
    lines.push(`<div class="meta-line">Customer: ${escapeHtml(name)}</div>`);
  }
  if (phone) {
    lines.push(`<div class="meta-line">Phone: ${escapeHtml(phone)}</div>`);
  }
  if (address) {
    lines.push(`<div class="meta-line">Address: ${escapeHtml(address)}</div>`);
  }
  if (notes) {
    lines.push(`<div class="meta-line">Delivery notes: ${escapeHtml(notes)}</div>`);
  }
  return `<section class="delivery-customer-block">${lines.join('')}</section>`;
}

function buildCustomerFooter(order: Order, template: ReceiptTemplate): string {
  const barcodeValue = formatOrderNumber(order);
  let barcodeSvg = '';
  if (template.showBarcode) {
    try {
      barcodeSvg = buildCode128Svg(barcodeValue, { height: 42, barWidth: 1.35 });
    } catch {
      barcodeSvg = '';
    }
  }

  const thanksBlock = template.showThanksMessage
    ? `<div class="footer-thanks">${escapeHtml(template.thanksMessage)}</div>`
    : '';
  const brandBlock = template.showBrandLine
    ? `<div class="footer-brand-line">${escapeHtml(template.brandLine)}</div>`
    : '';
  const contactBlock =
    template.showContactLine && template.contactLine.trim()
      ? `<div class="footer-contact">${escapeHtml(template.contactLine.trim())}</div>`
      : '';

  const hasFooterContent =
    barcodeSvg || thanksBlock || brandBlock || contactBlock || template.customTextBottom.trim();

  if (!hasFooterContent) return '';

  return `
    <footer class="footer-compact">
      ${buildCustomTextBlock(template.customTextBottom)}
      ${
        barcodeSvg
          ? `<div class="barcode-block">
              ${barcodeSvg}
              <div class="barcode-label">${escapeHtml(barcodeValue)}</div>
            </div>`
          : ''
      }
      ${thanksBlock}
      ${brandBlock}
      ${contactBlock}
    </footer>`;
}

function buildReceiptStyles(
  widthMm: number,
  logoSizePx: number,
  _copyType: ReceiptCopyType = 'customer',
): string {
  const compact = widthMm <= 58;
  const base = compact ? 12 : 13;
  const sm = compact ? 11 : 12;
  const md = compact ? 13 : 14;
  const lg = compact ? 15 : 17;
  const xl = compact ? 17 : 20;
  const grand = compact ? 15 : 17;

  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${widthMm}mm;
      max-width: ${widthMm}mm;
      min-width: ${widthMm}mm;
      margin: 0;
      padding: 0;
      height: auto;
      min-height: 0;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: "Courier New", Courier, monospace;
      background: #fff;
      color: #000;
      font-weight: 700;
      font-size: ${base}px;
      line-height: 1.45;
      -webkit-font-smoothing: none;
    }
    .receipt {
      width: ${widthMm}mm;
      max-width: ${widthMm}mm;
      margin: 0;
      padding: 3mm 2.5mm 1.5mm;
      background: #fff;
    }
    .center { text-align: center; }
    .logo {
      width: ${logoSizePx}px;
      max-width: 94%;
      height: auto;
      max-height: ${Math.round(logoSizePx * 1.15)}px;
      object-fit: contain;
      border-radius: 3px;
      margin: 0 auto 6px;
      display: block;
    }
    .store-name {
      font-size: ${xl}px;
      font-weight: 800;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      line-height: 1.2;
      margin-bottom: 2px;
      color: #000;
      word-wrap: break-word;
    }
    .store-address {
      font-size: ${sm}px;
      font-weight: 700;
      color: #000;
      line-height: 1.3;
      margin: 2px 0 4px;
      padding: 0 2px;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    .copy-banner {
      display: inline-block;
      margin-top: 5px;
      padding: 2px 7px;
      border: 2px solid #000;
      font-size: ${sm}px;
      font-weight: 800;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      color: #000;
    }
    .copy-banner.kitchen {
      border-style: double;
      border-width: 3px;
    }
    .rule {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .rule.strong {
      border-top-width: 2px;
      border-top-style: solid;
      margin-top: 4px;
    }
    .order-id {
      font-size: ${md}px;
      font-weight: 800;
      margin-bottom: 2px;
      color: #000;
    }
    .order-datetime {
      font-size: ${base}px;
      font-weight: 700;
      margin-bottom: 4px;
      color: #000;
    }
    .meta-line, .meta-row, .row, .item-row, .modifier-row, .total-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 4px;
      width: 100%;
    }
    .meta-line {
      font-size: ${base}px;
      font-weight: 700;
      line-height: 1.35;
      color: #000;
      margin-bottom: 1px;
    }
    .meta-row {
      font-size: ${base}px;
      font-weight: 700;
      margin-bottom: 1px;
    }
    .col-left {
      flex: 1;
      min-width: 0;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    .col-right {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
    }
    .section-heading {
      font-size: ${base}px;
      font-weight: 800;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      margin-bottom: 4px;
      color: #000;
    }
    .items-header {
      display: flex;
      justify-content: space-between;
      gap: 4px;
      font-size: ${base}px;
      font-weight: 800;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      margin-bottom: 4px;
      color: #000;
    }
    .item {
      padding-top: 3px;
      padding-bottom: 5px;
      page-break-inside: avoid;
    }
    .item:not(:last-child) {
      margin-bottom: 4px;
      border-bottom: 1px dotted #000;
    }
    .item-row {
      font-size: ${md}px;
      font-weight: 800;
      color: #000;
    }
    .kitchen-items-section .items-header {
      margin-bottom: 0;
    }
    .kitchen-items-header .col-right {
      text-transform: none;
      letter-spacing: 0;
      font-weight: 800;
    }
    .kitchen-rule-solid {
      border-top: 1px solid #000;
      margin: 0;
      width: 100%;
    }
    .kitchen-item-group {
      padding-top: 4px;
    }
    .kitchen-item-group .kitchen-rule-solid {
      margin-top: 4px;
    }
    .kitchen-item-row .col-left {
      font-size: ${md}px;
      font-weight: 800;
    }
    .kitchen-item-row .col-right {
      font-size: ${lg}px;
      font-weight: 800;
      min-width: 1.5em;
    }
    .sub-line {
      font-size: ${sm}px;
      font-weight: 700;
      color: #000;
      padding-left: 2px;
      margin-top: 1px;
      line-height: 1.35;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    .qty-line {
      font-weight: 700;
    }
    .sub-line.note {
      font-style: italic;
    }
    .modifier-row {
      font-size: ${sm}px;
      font-weight: 700;
      color: #000;
      padding-left: 2px;
      margin-top: 1px;
    }
    .empty-items {
      font-size: ${base}px;
      font-weight: 700;
      color: #000;
    }
    .custom-receipt-block {
      margin: 4px 0 2px;
      text-align: center;
      font-size: ${sm}px;
      font-weight: 700;
      line-height: 1.35;
      color: #000;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .custom-text-line + .custom-text-line {
      margin-top: 2px;
    }
    .item-row--name-only {
      font-size: ${md}px;
      font-weight: 800;
      color: #000;
      word-wrap: break-word;
    }
    .totals {
      font-size: ${base}px;
      font-weight: 700;
      color: #000;
    }
    .total-row {
      padding: 1px 0;
    }
    .total-row.grand {
      font-size: ${grand}px;
      font-weight: 800;
      margin-top: 2px;
      padding-top: 2px;
    }
    .grand-label, .grand-amount {
      font-weight: 800;
    }
    .payment-section {
      margin-top: 6px;
      font-size: ${base}px;
      font-weight: 700;
      color: #000;
    }
    .payment-section .row {
      padding: 1px 0;
    }
    .notes-block {
      margin-top: 6px;
      font-size: ${base}px;
      font-weight: 700;
      line-height: 1.4;
      color: #000;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .footer-compact {
      margin-top: 5px;
      padding-top: 4px;
      border-top: 1px dashed #000;
      text-align: center;
      color: #000;
      line-height: 1.25;
    }
    .footer-thanks {
      font-size: ${sm}px;
      font-weight: 700;
      margin-bottom: 3px;
    }
    .footer-brand-line {
      font-size: ${compact ? 10 : 11}px;
      font-weight: 800;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .footer-contact {
      font-size: ${compact ? 10 : 11}px;
      font-weight: 700;
    }
    .store-phone {
      font-size: ${sm}px;
      font-weight: 700;
      color: #000;
      line-height: 1.3;
      margin: 2px 0 4px;
      padding: 0 2px;
    }
    .receipt.customer-copy .customer-header {
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding: 6px 0 5px;
      margin-bottom: 2px;
    }
    .receipt.customer-copy .copy-banner {
      background: #fff;
      color: #000;
      border: 2px solid #000;
      padding: 2px 8px;
    }
    .receipt.customer-copy .copy-banner.unpaid {
      border: none;
      padding: 4px 0 2px;
      font-size: ${xl}px;
      letter-spacing: 0.8px;
    }
    .receipt.customer-copy .customer-totals-box {
      border: 1px solid #000;
      padding: 4px 5px;
      margin-top: 2px;
    }
    .receipt.customer-copy .customer-totals-box .rule:first-child {
      margin-top: 0;
    }
    .receipt.customer-copy .payment-section {
      border: 1px dashed #000;
      padding: 4px 5px;
    }
    .barcode-block {
      margin: 4px auto 5px;
      max-width: 92%;
    }
    .barcode-svg {
      display: block;
      margin: 0 auto;
    }
    .barcode-label {
      font-size: ${sm}px;
      font-weight: 800;
      letter-spacing: 0.8px;
      margin-top: 2px;
      text-transform: uppercase;
    }
    .receipt.kitchen-copy {
      padding-top: 1mm;
    }
    .receipt.kitchen-copy .kitchen-hero-number {
      background: #000;
      color: #fff;
      text-align: center;
      font-size: ${compact ? 26 : 32}px;
      font-weight: 800;
      line-height: 1.1;
      padding: 7px 4px;
      margin: 0 -1px 0;
      letter-spacing: 0.5px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt.kitchen-copy .kitchen-service {
      text-align: center;
      font-size: ${lg}px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 5px 2px 3px;
      line-height: 1.2;
    }
    .receipt.kitchen-copy .kitchen-datetime {
      font-size: ${base}px;
      font-weight: 700;
      padding: 0 1px 4px;
      border-bottom: 1px solid #000;
      margin-bottom: 4px;
    }
    .receipt.kitchen-copy .kitchen-server,
    .receipt.kitchen-copy .kitchen-order-note {
      font-size: ${sm}px;
      margin-bottom: 2px;
    }
    .receipt.kitchen-copy .kitchen-item-line {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 4px 0 2px;
      line-height: 1.25;
    }
    .receipt.kitchen-copy .kitchen-item-qty {
      flex-shrink: 0;
      min-width: 2em;
      font-size: ${lg}px;
      font-weight: 800;
      text-transform: lowercase;
    }
    .receipt.kitchen-copy .kitchen-item-name {
      flex: 1;
      font-size: ${md}px;
      font-weight: 800;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    .receipt.kitchen-copy .order-meta {
      margin-bottom: 2px;
    }
    .receipt.kitchen-copy .kitchen-items-header {
      display: none;
    }
    .receipt.kitchen-copy .kitchen-title,
    .receipt.kitchen-copy .store-name,
    .receipt.kitchen-copy .copy-banner {
      display: none;
    }
    @page {
      size: ${widthMm}mm auto;
      margin: 0;
    }
    @media print {
      html, body {
        width: ${widthMm}mm !important;
        max-width: ${widthMm}mm !important;
        min-width: ${widthMm}mm !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: #fff !important;
      }
      .receipt {
        width: ${widthMm}mm !important;
        max-width: ${widthMm}mm !important;
        margin: 0 !important;
        padding: 2mm 2.5mm 1mm !important;
        box-shadow: none;
        page-break-after: avoid;
        page-break-inside: avoid;
      }
      .item, .totals, .payment-section, .footer-compact {
        page-break-inside: avoid;
      }
      .copy-banner.unpaid {
        border: none !important;
      }
      .copy-banner:not(.unpaid) {
        background: #fff !important;
        color: #000 !important;
        border: 2px solid #000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
}

function buildPrintScript(widthMm: number): string {
  return `<script>
    (function () {
      var printed = false;
      var widthMm = ${widthMm};

      function applyPageSize() {
        var receipt = document.querySelector('.receipt');
        if (!receipt) return;

        var heightPx = receipt.scrollHeight;
        var heightMm = Math.max(Math.ceil((heightPx * 25.4) / 96) + 1, 40);

        var pageStyle = document.getElementById('dynamic-page-size');
        if (!pageStyle) {
          pageStyle = document.createElement('style');
          pageStyle.id = 'dynamic-page-size';
          document.head.appendChild(pageStyle);
        }
        pageStyle.textContent =
          '@page { size: ' + widthMm + 'mm ' + heightMm + 'mm; margin: 0; }';
      }

      function runPrint() {
        if (printed) return;
        printed = true;
        applyPageSize();
        window.focus();
        window.print();
      }

      var readyHandled = false;

      function onReady() {
        if (readyHandled) return;
        readyHandled = true;

        var images = document.images;
        if (!images.length) {
          runPrint();
          return;
        }
        var pending = images.length;
        function done() {
          pending -= 1;
          if (pending <= 0) runPrint();
        }
        for (var i = 0; i < images.length; i += 1) {
          if (images[i].complete) done();
          else {
            images[i].addEventListener('load', done, { once: true });
            images[i].addEventListener('error', done, { once: true });
          }
        }
      }

      window.addEventListener('beforeprint', applyPageSize, { once: true });

      if (document.readyState === 'complete') onReady();
      else window.addEventListener('load', onReady, { once: true });
    })();
  </script>`;
}

function buildReceiptHtml(order: Order, options: PrintReceiptOptions, autoPrint: boolean): string {
  const {
    tableLabel,
    businessName = APP_NAME,
    businessLocation,
    businessPhone,
    businessPhoneSecondary,
    businessLogoUrl,
    copyType = 'customer',
  } = options;
  const template = resolveReceiptTemplate(options);
  const addressLine = businessLocation?.trim();
  const restaurantPhonesJoined = formatRestaurantReceiptPhones(
    businessPhone,
    businessPhoneSecondary,
  );
  const currency = options.currency?.trim() || DEFAULT_CURRENCY;
  const copyLabel = copyTypeLabel(copyType, template, order);
  const widthMm = options.receiptWidthMm ?? template.receiptWidthMm ?? RECEIPT_WIDTH_MM;
  const isKitchen = copyType === 'kitchen';
  const isUnpaidCustomerCopy = !isKitchen && copyLabel === UNPAID_RECEIPT_BANNER;
  const kitchenServiceLine = isKitchen
    ? resolveKitchenServiceLine(order, options.tableMap)
    : tableLabel;
  const metaTableLabel = isKitchen ? kitchenServiceLine : tableLabel;

  const printScript = autoPrint ? buildPrintScript(widthMm) : '';

  const labels = template.labels;
  const showItemAmounts = !isKitchen && template.showItemAmounts;
  const itemCol = labels.itemsColumn.trim();
  const amountCol = labels.amountColumn.trim();
  const itemsHeader = isKitchen
    ? `<div class="items-header kitchen-items-header" aria-hidden="true"></div>`
    : !itemCol && !amountCol
      ? ''
      : showItemAmounts && itemCol && amountCol
        ? `<div class="items-header">
        <span class="col-left">${escapeHtml(itemCol)}</span>
        <span class="col-right">${escapeHtml(amountCol)}</span>
      </div>`
        : itemCol
          ? `<div class="items-header">
        <span class="col-left">${escapeHtml(itemCol)}</span>
      </div>`
          : '';

  const phoneDisplay = restaurantPhonesJoined
    ? template.labels.phonePrefix === ''
      ? escapeHtml(restaurantPhonesJoined)
      : `${escapeHtml(template.labels.phonePrefix)} ${escapeHtml(restaurantPhonesJoined)}`
    : '';

  const receiptCtx = !isKitchen
    ? buildReceiptContext(order, template, {
        tableLabel,
        businessName,
        addressLine: addressLine ?? '',
        phoneLine: restaurantPhonesJoined ?? '',
        copyBanner: copyLabel,
        currency,
      })
    : ({} as ReceiptPlaceholderContext);

  const customerFooter = buildCustomerFooter(order, template);
  const customTopBlock = !isKitchen
    ? buildCustomTextBlock(template.customTextTop) +
      renderCustomBlocksHtml('after_header', template, receiptCtx)
    : '';
  const beforeItemsBlock = !isKitchen
    ? renderCustomBlocksHtml('before_items', template, receiptCtx)
    : '';
  const afterItemsBlock = !isKitchen
    ? renderCustomBlocksHtml('after_items', template, receiptCtx)
    : '';
  const afterPaymentBlock = !isKitchen
    ? renderCustomBlocksHtml('after_payment', template, receiptCtx)
    : '';
  const beforeFooterBlock = !isKitchen
    ? renderCustomBlocksHtml('before_footer', template, receiptCtx)
    : '';

  const showLogo = !isKitchen && template.showLogo && Boolean(businessLogoUrl);
  const showName = !isKitchen && template.showBusinessName;
  const showAddress = !isKitchen && template.showAddress && Boolean(addressLine);
  const showPhone = !isKitchen && template.showPhone && Boolean(restaurantPhonesJoined);
  const showCopyBanner = !isKitchen && template.showCopyBanner;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${widthMm}mm, initial-scale=1" />
  <title>${escapeHtml(copyLabel)} ${escapeHtml(formatOrderLabel(order))}</title>
  <style>${buildReceiptStyles(widthMm, template.logoSizePx, copyType)}</style>
</head>
<body>
  <div class="receipt ${isKitchen ? 'kitchen-copy' : 'customer-copy'}">
    <header class="center ${isKitchen ? '' : 'customer-header'}">
      ${isKitchen ? `<div class="kitchen-title">Kitchen Ticket</div>` : ''}
      ${showLogo ? `<img src="${escapeHtml(businessLogoUrl!)}" alt="" class="logo" />` : ''}
      ${showName ? `<div class="store-name">${escapeHtml(businessName)}</div>` : ''}
      ${showAddress ? `<div class="store-address">${escapeHtml(addressLine!)}</div>` : ''}
      ${showPhone ? `<div class="store-phone">${phoneDisplay}</div>` : ''}
      ${
        showCopyBanner
          ? `<div class="copy-banner ${isKitchen ? 'kitchen' : ''}${isUnpaidCustomerCopy ? ' unpaid' : ''}">${escapeHtml(copyLabel)}</div>`
          : isKitchen
            ? `<div class="copy-banner kitchen">${escapeHtml(copyLabel)}</div>`
            : ''
      }
    </header>

    ${customTopBlock}

    <div class="rule"></div>

    <section class="order-meta">
      ${buildOrderMetaHtml(order, metaTableLabel, copyType, template, receiptCtx)}
    </section>

    ${buildDeliveryCustomerHtml(order, copyType)}

    ${beforeItemsBlock}

    ${isKitchen ? '' : '<div class="rule"></div>'}

    <section class="items-section${isKitchen ? ' kitchen-items-section' : ''}">
      ${itemsHeader}
      ${isKitchen ? '<div class="kitchen-rule-solid"></div>' : ''}
      ${isKitchen ? buildKitchenItemsHtml(order) : buildItemsHtml(order, showItemAmounts)}
    </section>

    ${afterItemsBlock}

    ${isKitchen || !template.showTotals ? '' : `<div class="customer-totals-box">${buildTotalsHtml(order, currency, template)}</div>`}

    ${isKitchen || !template.showPayment ? '' : buildPaymentHtml(order, currency, template)}

    ${afterPaymentBlock}

    ${
      !isKitchen && template.showOrderNotes && order.notes
        ? `<div class="rule"></div>
           <section>
             ${labels.notesHeading ? `<div class="section-heading">${escapeHtml(labels.notesHeading)}</div>` : ''}
             <div class="notes-block">${escapeHtml(order.notes)}</div>
           </section>`
        : ''
    }

    ${beforeFooterBlock}

    ${isKitchen ? '' : customerFooter}
  </div>
  ${printScript}
</body>
</html>`;
}

function openReceiptPreview(html: string, widthMm: number): Window {
  const widthPx = Math.ceil((widthMm * 96) / 25.4) + 40;
  const features = `width=${Math.max(widthPx, 300)},height=720,menubar=no,toolbar=no,location=no,status=no`;
  const win = window.open('', '_blank', features);
  if (!win) {
    throw new Error('Pop-up blocked. Allow pop-ups to preview receipts.');
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.document.title = 'Receipt preview';
  return win;
}

function printReceiptViaIframe(html: string, widthMm: number): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Receipt print');
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
    throw new Error('Unable to prepare receipt for printing.');
  }

  frameWindow.onafterprint = cleanup;
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  window.setTimeout(cleanup, 4000);
}

export function renderOrderReceiptHtml(order: Order, options: PrintReceiptOptions): string {
  return buildReceiptHtml(order, options, false);
}

/** Open receipt in a new tab for layout testing (no auto-print). */
export function previewOrderReceipt(order: Order, options: PrintReceiptOptions) {
  const template = resolveReceiptTemplate(options);
  const widthMm = options.receiptWidthMm ?? template.receiptWidthMm ?? RECEIPT_WIDTH_MM;
  const html = buildReceiptHtml(order, options, false);
  openReceiptPreview(html, widthMm);
}

export function printOrderReceipt(order: Order, options: PrintReceiptOptions) {
  const template = resolveReceiptTemplate(options);
  const widthMm = options.receiptWidthMm ?? template.receiptWidthMm ?? RECEIPT_WIDTH_MM;
  const html = buildReceiptHtml(order, options, true);
  printReceiptViaIframe(html, widthMm);
}
