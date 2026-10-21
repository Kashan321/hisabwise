import PDFDocument from 'pdfkit';
import { APP_NAME } from '../../../config/branding';

export type SubscriptionInvoicePdfInput = {
  invoiceNumber: string;
  businessName: string;
  businessSlug: string;
  amount: number;
  currency: string;
  billingInterval?: string | null;
  dueAt: Date;
  sentAt: Date;
  periodEndsAt?: Date | null;
  variant: 'payment_request' | 'purchase_receipt';
  note?: string | null;
  bankName?: string | null;
  accountTitle?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  swiftCode?: string | null;
  paymentInstructions?: string | null;
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function buildSubscriptionInvoicePdf(input: SubscriptionInvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const isReceipt = input.variant === 'purchase_receipt';
    const periodLabel =
      input.billingInterval === 'YEARLY'
        ? 'Yearly subscription'
        : input.billingInterval === 'MONTHLY'
          ? 'Monthly subscription'
          : 'Platform subscription';

    const title = isReceipt ? 'Subscription purchase invoice' : 'Subscription invoice';
    doc.fontSize(22).text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#444444').text(`Invoice ${input.invoiceNumber}`, { align: 'center' });
    if (isReceipt) {
      doc.text('Paid', { align: 'center' });
    }
    doc.fillColor('#000000');
    doc.moveDown(1.5);

    doc.fontSize(12).text(`Bill to: ${input.businessName}`);
    doc.text(`Tenant: ${input.businessSlug}`);
    doc.text(`Issue date: ${input.sentAt.toLocaleDateString()}`);
    if (isReceipt) {
      doc.text(`Payment date: ${input.sentAt.toLocaleDateString()}`);
      if (input.periodEndsAt) {
        doc.text(`Subscription valid until: ${input.periodEndsAt.toLocaleDateString()}`);
      }
    } else {
      doc.text(`Due date: ${input.dueAt.toLocaleDateString()}`);
    }
    doc.moveDown();

    doc.fontSize(14).text(isReceipt ? 'Amount paid' : 'Amount due', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(18).text(formatMoney(input.amount, input.currency));
    doc.fontSize(11).text(periodLabel);
    doc.moveDown();

    if (input.note?.trim()) {
      doc.fontSize(12).text('Note', { underline: true });
      doc.fontSize(11).text(input.note.trim());
      doc.moveDown();
    }

    if (!isReceipt) {
      const hasBank =
        input.bankName ||
        input.accountTitle ||
        input.accountNumber ||
        input.iban ||
        input.paymentInstructions;
      if (hasBank) {
        doc.fontSize(12).text('Payment details', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(11);
        if (input.bankName) doc.text(`Bank: ${input.bankName}`);
        if (input.accountTitle) doc.text(`Account title: ${input.accountTitle}`);
        if (input.accountNumber) doc.text(`Account number: ${input.accountNumber}`);
        if (input.iban) doc.text(`IBAN: ${input.iban}`);
        if (input.swiftCode) doc.text(`SWIFT: ${input.swiftCode}`);
        if (input.paymentInstructions?.trim()) {
          doc.moveDown(0.3);
          doc.text(input.paymentInstructions.trim());
        }
        doc.moveDown();
      }

      doc.fontSize(10).fillColor('#555555').text(
        `After paying, upload your payment proof on the Subscription page in your ${APP_NAME} dashboard.`,
        { align: 'left' },
      );
    } else {
      doc.fontSize(10).fillColor('#555555').text(
        'Thank you for your subscription. Keep this invoice for your records.',
        { align: 'left' },
      );
    }

    doc.end();
  });
}
