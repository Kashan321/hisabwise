import { createHash, randomInt } from 'crypto';
import { EmailVerificationPurpose } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../database/prisma-client';
import { logger } from '../logger/logger';
import { sendRawEmail } from './mail-transport';
import { registerOtpEmail } from './templates/register-otp.template';
import { welcomeOnboardingEmail } from './templates/welcome-onboarding.template';
import { subscriptionInvoiceEmail } from './templates/subscription-invoice.template';
import { ROLES } from '../../config/constants';

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateOtpCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

export async function resolveBusinessOwnerRecipient(businessId: string) {
  return prisma.user.findFirst({
    where: {
      businessId,
      userRoles: { some: { role: { name: ROLES.OWNER, isSystem: true } } },
    },
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: 'asc' },
  });
}

export class TenantEmailService {
  async sendRegisterOtp(rawEmail: string): Promise<{ sent: boolean; expiresInSeconds: number }> {
    const email = rawEmail.trim().toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new Error('DUPLICATE_EMAIL');
    }

    const recent = await prisma.emailVerificationCode.findFirst({
      where: {
        email,
        purpose: EmailVerificationPurpose.REGISTER,
        consumedAt: null,
        createdAt: { gte: new Date(Date.now() - OTP_RESEND_COOLDOWN_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const waitMs = OTP_RESEND_COOLDOWN_MS - (Date.now() - recent.createdAt.getTime());
      throw new Error(`COOLDOWN:${Math.ceil(waitMs / 1000)}`);
    }

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await prisma.emailVerificationCode.create({
      data: {
        email,
        purpose: EmailVerificationPurpose.REGISTER,
        codeHash: hashOtp(code),
        expiresAt,
      },
    });

    const template = registerOtpEmail({ code, expiresMinutes: OTP_TTL_MS / 60_000 });
    const result = await sendRawEmail({ to: email, ...template });
    if (env.EMAIL_DEV_LOG && result.devLogged) {
      logger.info({ email, code }, 'Register OTP (dev)');
    }
    return { sent: result.sent, expiresInSeconds: OTP_TTL_MS / 1000 };
  }

  async verifyRegisterOtp(email: string, code: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const record = await prisma.emailVerificationCode.findFirst({
      where: {
        email: normalized,
        purpose: EmailVerificationPurpose.REGISTER,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new Error('OTP_EXPIRED');
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new Error('OTP_MAX_ATTEMPTS');
    }
    if (record.codeHash !== hashOtp(code.trim())) {
      await prisma.emailVerificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new Error('OTP_INVALID');
    }
    await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
  }

  async sendWelcomeOnboarding(
    businessId: string,
    options?: { force?: boolean },
  ): Promise<{ sent: boolean; reason?: string }> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, slug: true, welcomeEmailSentAt: true },
    });
    if (!business) return { sent: false, reason: 'BUSINESS_NOT_FOUND' };
    if (business.welcomeEmailSentAt && !options?.force) {
      return { sent: false, reason: 'ALREADY_SENT' };
    }

    const owner = await resolveBusinessOwnerRecipient(businessId);
    if (!owner?.email) return { sent: false, reason: 'NO_OWNER_EMAIL' };

    const dashboardUrl = `${env.APP_URL.replace(/\/$/, '')}/${business.slug}/dashboard`;
    const template = welcomeOnboardingEmail({
      ownerName: owner.name,
      businessName: business.name,
      dashboardUrl,
      slug: business.slug,
    });
    const result = await sendRawEmail({ to: owner.email, ...template });
    if (result.sent) {
      await prisma.business.update({
        where: { id: businessId },
        data: { welcomeEmailSentAt: new Date() },
      });
    }
    return { sent: result.sent };
  }

  async sendInvoiceEmailToOwner(params: {
    businessId: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    pdfUrl: string;
    kind: 'payment_request' | 'purchase_receipt';
    dueAt?: Date;
    periodEndsAt?: Date | null;
    note?: string | null;
  }): Promise<{ sent: boolean }> {
    const business = await prisma.business.findUnique({
      where: { id: params.businessId },
      select: { name: true },
    });
    const owner = await resolveBusinessOwnerRecipient(params.businessId);
    if (!owner?.email || !business) return { sent: false };

    const amountLabel = `${params.currency} ${params.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    const template = subscriptionInvoiceEmail({
      ownerName: owner.name,
      businessName: business.name,
      invoiceNumber: params.invoiceNumber,
      amountLabel,
      pdfUrl: params.pdfUrl,
      kind: params.kind,
      dueDateLabel: params.dueAt?.toLocaleDateString(undefined, { dateStyle: 'medium' }),
      periodEndLabel: params.periodEndsAt
        ? params.periodEndsAt.toLocaleDateString(undefined, { dateStyle: 'medium' })
        : undefined,
      note: params.note,
    });
    const result = await sendRawEmail({ to: owner.email, ...template });
    return { sent: result.sent };
  }
}

export const tenantEmailService = new TenantEmailService();

export async function emailInvoiceToOwner(mapped: {
  businessId?: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  pdfUrl: string;
  kind?: string;
  dueAt: string;
  periodEndsAt?: string | null;
  note?: string | null;
}, businessId: string) {
  const kind =
    mapped.kind === 'PURCHASE_RECEIPT' ? ('purchase_receipt' as const) : ('payment_request' as const);
  await tenantEmailService
    .sendInvoiceEmailToOwner({
      businessId,
      invoiceNumber: mapped.invoiceNumber,
      amount: mapped.amount,
      currency: mapped.currency,
      pdfUrl: mapped.pdfUrl,
      kind,
      dueAt: new Date(mapped.dueAt),
      periodEndsAt: mapped.periodEndsAt ? new Date(mapped.periodEndsAt) : null,
      note: mapped.note,
    })
    .catch((err) => logger.warn({ err, businessId }, 'Invoice email failed'));
}
