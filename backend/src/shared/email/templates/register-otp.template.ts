import { APP_NAME, BRANDING } from '../../../config/branding';
import { emailLayout } from './layout';

export function registerOtpEmail(params: { code: string; expiresMinutes: number }) {
  const subject = `${APP_NAME} — verify your email`;
  const text = `Your verification code is ${params.code}. It expires in ${params.expiresMinutes} minutes.`;
  const html = emailLayout(
    `
    <h1 style="margin:0 0 12px;font-size:22px;color:#0f1f1a">Verify your email</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#3d4f48">
      Enter this code to finish creating your ${APP_NAME} restaurant account:
    </p>
    <p style="margin:0 0 8px;text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:${BRANDING.emailPrimaryColor};font-family:Consolas,Monaco,monospace">
      ${params.code}
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#5c6f68;text-align:center">
      Expires in ${params.expiresMinutes} minutes. If you did not sign up, you can ignore this email.
    </p>
  `,
    `Your code: ${params.code}`,
  );
  return { subject, html, text };
}
