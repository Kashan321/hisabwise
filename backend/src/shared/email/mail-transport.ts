import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../logger/logger';

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_FROM);
}

function getTransporter(): Transporter | null {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }
  return transporter;
}

export async function sendRawEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ sent: boolean; devLogged?: boolean }> {
  const to = input.to.trim().toLowerCase();
  if (!to) return { sent: false };

  const transport = getTransporter();
  if (!transport) {
    if (env.EMAIL_DEV_LOG || env.NODE_ENV === 'development') {
      logger.info(
        { to, subject: input.subject, textPreview: input.text.slice(0, 500) },
        'Email not sent (SMTP not configured) — logged for development',
      );
      return { sent: true, devLogged: true };
    }
    logger.warn({ to, subject: input.subject }, 'Email skipped: SMTP not configured');
    return { sent: false };
  }

  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  return { sent: true };
}
