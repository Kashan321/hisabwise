import { APP_NAME } from '../../../config/branding';
import { emailButton, emailLayout } from './layout';

export function subscriptionInvoiceEmail(params: {
  ownerName: string;
  businessName: string;
  invoiceNumber: string;
  amountLabel: string;
  pdfUrl: string;
  kind: 'payment_request' | 'purchase_receipt';
  dueDateLabel?: string;
  periodEndLabel?: string;
  note?: string | null;
}) {
  const isReceipt = params.kind === 'purchase_receipt';
  const subject = isReceipt
    ? `${APP_NAME} receipt ${params.invoiceNumber}`
    : `${APP_NAME} invoice ${params.invoiceNumber} — payment due`;

  const text = isReceipt
    ? `Receipt ${params.invoiceNumber} for ${params.businessName}. Amount: ${params.amountLabel}. PDF: ${params.pdfUrl}`
    : `Invoice ${params.invoiceNumber} for ${params.businessName}. Amount: ${params.amountLabel}. Due: ${params.dueDateLabel ?? 'see PDF'}. PDF: ${params.pdfUrl}`;

  const html = emailLayout(
    `
    <h1 style="margin:0 0 12px;font-size:22px;color:#0f1f1a">
      ${isReceipt ? 'Subscription receipt' : 'Subscription invoice'}
    </h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3d4f48">
      Hi ${params.ownerName}, here is your ${isReceipt ? 'paid receipt' : 'invoice'} for
      <strong>${params.businessName}</strong>.
    </p>
    <table role="presentation" width="100%" style="margin:0 0 20px;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#5c6f68">Document</td><td style="padding:8px 0;text-align:right;font-weight:600">${params.invoiceNumber}</td></tr>
      <tr><td style="padding:8px 0;color:#5c6f68">Amount</td><td style="padding:8px 0;text-align:right;font-weight:600">${params.amountLabel}</td></tr>
      ${params.dueDateLabel && !isReceipt ? `<tr><td style="padding:8px 0;color:#5c6f68">Due</td><td style="padding:8px 0;text-align:right;font-weight:600">${params.dueDateLabel}</td></tr>` : ''}
      ${params.periodEndLabel ? `<tr><td style="padding:8px 0;color:#5c6f68">Active until</td><td style="padding:8px 0;text-align:right;font-weight:600">${params.periodEndLabel}</td></tr>` : ''}
    </table>
    ${params.note ? `<p style="margin:0 0 16px;font-size:14px;color:#3d4f48">${params.note}</p>` : ''}
    ${emailButton(params.pdfUrl, 'Download PDF')}
    ${!isReceipt ? `<p style="margin:12px 0 0;font-size:13px;color:#5c6f68">After paying, upload proof from Subscription in your dashboard.</p>` : ''}
  `,
    params.invoiceNumber,
  );
  return { subject, html, text };
}
