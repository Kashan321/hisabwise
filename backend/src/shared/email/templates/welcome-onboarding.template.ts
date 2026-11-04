import { APP_NAME } from '../../../config/branding';
import { emailButton, emailLayout } from './layout';

export function welcomeOnboardingEmail(params: {
  ownerName: string;
  businessName: string;
  dashboardUrl: string;
  slug: string;
}) {
  const subject = `Welcome to ${APP_NAME} — ${params.businessName} is ready`;
  const text = `Hi ${params.ownerName}, welcome to ${APP_NAME}! Open your dashboard: ${params.dashboardUrl}`;
  const html = emailLayout(
    `
    <h1 style="margin:0 0 12px;font-size:22px;color:#0f1f1a">Welcome aboard, ${params.ownerName}!</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#3d4f48">
      <strong>${params.businessName}</strong> is set up on ${APP_NAME}. Here is a quick path to go live:
    </p>
    <ol style="margin:0 0 8px;padding-left:20px;font-size:15px;line-height:1.7;color:#3d4f48">
      <li>Add your menu items and categories</li>
      <li>Configure floor plan / tables for dine-in</li>
      <li>Invite staff and assign roles</li>
      <li>Open a business day and start taking orders</li>
    </ol>
    <p style="margin:16px 0 0;font-size:14px;color:#5c6f68">Your restaurant link: <strong>/${params.slug}</strong></p>
    ${emailButton(params.dashboardUrl, 'Open dashboard')}
    <p style="margin:8px 0 0;font-size:13px;color:#5c6f68;text-align:center">
      Need help? Reply to this email or contact our support team.
    </p>
  `,
    `Welcome to ${APP_NAME}`,
  );
  return { subject, html, text };
}
