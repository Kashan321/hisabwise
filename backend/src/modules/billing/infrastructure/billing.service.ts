import {
  BillingInterval,
  PaymentSubmissionStatus,
  SubscriptionInvoiceKind,
  SubscriptionInvoiceStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { APP_NAME } from '../../../config/branding';
import { prisma } from '../../../shared/database/prisma-client';
import { ForbiddenError } from '../../auth/domain/errors/auth.errors';
import { BusinessNotFoundError } from '../../tenants/domain/errors/tenant.errors';
import {
  addIntervalEnd,
  getAccessPeriodEnd,
  getSubscriptionDaysRemaining,
  isSubscriptionLocked,
} from '../domain/subscription-access';
import { billingSettingsRepository } from './billing-settings.repository';
import { normalizeStorageKey } from '../../files/infrastructure/storage-reference';
import { filesModule } from '../../files/infrastructure/files.module';
import { fileStorageService } from '../../files/infrastructure/storage.factory';
import { buildSubscriptionInvoicePdf } from './subscription-invoice-pdf';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const PURCHASE_RECEIPT_ALERT_DAYS = 30;

function computeDaysUntil(end: Date, now = Date.now()): number {
  return Math.max(0, Math.ceil((end.getTime() - now) / MS_PER_DAY));
}

function decimalToNumber(value: { toString(): string }): number {
  return Number(value.toString());
}

function mapSettings(settings: Awaited<ReturnType<typeof billingSettingsRepository.getOrCreate>>) {
  return {
    defaultTrialDays: settings.defaultTrialDays,
    monthlyPrice: decimalToNumber(settings.monthlyPrice),
    yearlyPrice: decimalToNumber(settings.yearlyPrice),
    currency: settings.currency,
    bankName: settings.bankName,
    accountTitle: settings.accountTitle,
    accountNumber: settings.accountNumber,
    iban: settings.iban,
    swiftCode: settings.swiftCode,
    paymentInstructions: settings.paymentInstructions,
  };
}

export class BillingService {
  async getSubscription(businessId: string) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new BusinessNotFoundError();

    const settings = await billingSettingsRepository.getOrCreate();
    const pendingSubmission = await prisma.paymentSubmission.findFirst({
      where: { businessId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    const hasPendingPayment = Boolean(pendingSubmission);
    const locked = isSubscriptionLocked({ ...business, hasPendingPayment });
    const periodEndsAt = getAccessPeriodEnd(business);
    const daysRemaining = getSubscriptionDaysRemaining(business);
    const expiryWarning =
      daysRemaining !== null && daysRemaining <= 2 && !locked && !hasPendingPayment;
    const subscriptionInvoice = await this.getActiveSubscriptionInvoiceAlert(businessId);
    const purchaseReceipt = await this.getActivePurchaseReceiptAlert(businessId);
    const latestPurchaseReceipt = await this.getLatestPurchaseReceipt(businessId);

    return {
      businessId: business.id,
      status: business.subscriptionStatus,
      subscriptionStatus: business.subscriptionStatus,
      billingInterval: business.billingInterval,
      trialEndsAt: business.trialEndsAt,
      subscriptionEndsAt: business.subscriptionEndsAt,
      periodEndsAt,
      daysRemaining,
      expiryWarning,
      isLocked: locked,
      isSubscriptionBlocked: business.isSubscriptionBlocked,
      hasPendingPayment,
      subscriptionInvoice,
      purchaseReceipt,
      latestPurchaseReceipt,
      plans: {
        monthly: {
          interval: 'MONTHLY' as const,
          price: decimalToNumber(settings.monthlyPrice),
          currency: settings.currency,
        },
        yearly: {
          interval: 'YEARLY' as const,
          price: decimalToNumber(settings.yearlyPrice),
          currency: settings.currency,
        },
      },
    };
  }

  async getPaymentInstructions() {
    const settings = await billingSettingsRepository.getOrCreate();
    return {
      ...mapSettings(settings),
      plans: {
        monthly: {
          interval: 'MONTHLY' as const,
          price: decimalToNumber(settings.monthlyPrice),
          currency: settings.currency,
        },
        yearly: {
          interval: 'YEARLY' as const,
          price: decimalToNumber(settings.yearlyPrice),
          currency: settings.currency,
        },
      },
    };
  }

  async submitPayment(
    businessId: string,
    input: { interval: BillingInterval; proofImageUrl: string },
  ) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new BusinessNotFoundError();

    const existingPending = await prisma.paymentSubmission.findFirst({
      where: { businessId, status: 'PENDING' },
    });
    if (existingPending) {
      throw new Error('A payment submission is already pending review');
    }

    const settings = await billingSettingsRepository.getOrCreate();
    const amount =
      input.interval === 'MONTHLY'
        ? decimalToNumber(settings.monthlyPrice)
        : decimalToNumber(settings.yearlyPrice);

    const submission = await prisma.paymentSubmission.create({
      data: {
        businessId,
        interval: input.interval,
        amount,
        proofImageUrl: normalizeStorageKey(input.proofImageUrl),
      },
    });

    return submission;
  }

  async listMySubmissions(businessId: string) {
    return prisma.paymentSubmission.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getBillingSettings() {
    const settings = await billingSettingsRepository.getOrCreate();
    return mapSettings(settings);
  }

  async updateBillingSettings(
    data: Parameters<typeof billingSettingsRepository.update>[0],
  ) {
    const settings = await billingSettingsRepository.update(data);
    return mapSettings(settings);
  }

  async listPaymentSubmissions(filters?: { businessId?: string; status?: PaymentSubmissionStatus }) {
    const submissions = await prisma.paymentSubmission.findMany({
      where: {
        businessId: filters?.businessId,
        status: filters?.status,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        business: { select: { id: true, name: true, slug: true } },
      },
    });

    return Promise.all(
      submissions.map(async (submission) => {
        const resolved = await filesModule.getFileReadUrl.execute(submission.proofImageUrl);
        return {
          ...submission,
          proofImageUrl: resolved.url,
        };
      }),
    );
  }

  async reviewPaymentSubmission(
    submissionId: string,
    platformUserId: string,
    action: 'approve' | 'reject',
    adminNote?: string,
  ) {
    const submission = await prisma.paymentSubmission.findUnique({
      where: { id: submissionId },
      include: { business: true },
    });
    if (!submission) {
      throw new Error('Payment submission not found');
    }
    if (submission.status !== 'PENDING') {
      throw new Error('Payment submission already reviewed');
    }

    const now = new Date();
    if (action === 'reject') {
      return prisma.paymentSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'REJECTED',
          adminNote: adminNote ?? null,
          reviewedById: platformUserId,
          reviewedAt: now,
        },
      });
    }

    const subscriptionEndsAt = addIntervalEnd(now, submission.interval);

    await prisma.$transaction([
      prisma.paymentSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'APPROVED',
          adminNote: adminNote ?? null,
          reviewedById: platformUserId,
          reviewedAt: now,
        },
      }),
      prisma.business.update({
        where: { id: submission.businessId },
        data: {
          subscriptionStatus: 'ACTIVE',
          billingInterval: submission.interval,
          subscriptionEndsAt,
          trialEndsAt: null,
          isSubscriptionBlocked: false,
        },
      }),
      prisma.subscriptionInvoice.updateMany({
        where: {
          businessId: submission.businessId,
          status: 'OPEN',
          kind: SubscriptionInvoiceKind.PAYMENT_REQUEST,
        },
        data: { status: 'PAID' },
      }),
    ]);

    await this.issuePurchaseReceiptForSubmission(submissionId, platformUserId).catch(() => {
      /* receipt generation is best-effort; approval already succeeded */
    });

    return prisma.paymentSubmission.findUnique({ where: { id: submissionId } });
  }

  async setBusinessTrialDays(businessId: string, trialDays: number) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new BusinessNotFoundError();

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    return prisma.business.update({
      where: { id: businessId },
      data: {
        subscriptionStatus: 'TRIAL',
        trialEndsAt,
        subscriptionEndsAt: null,
        billingInterval: null,
        isSubscriptionBlocked: false,
      },
    });
  }

  async handleStripeWebhook(eventType: string, businessId?: string) {
    if (!businessId) {
      return { handled: false, reason: 'Missing business reference' };
    }

    let subscriptionStatus: SubscriptionStatus | null = null;

    if (eventType === 'invoice.payment_failed') {
      subscriptionStatus = 'PAST_DUE';
    } else if (eventType === 'customer.subscription.deleted') {
      subscriptionStatus = 'CANCELLED';
    } else if (eventType === 'invoice.payment_succeeded') {
      subscriptionStatus = 'ACTIVE';
    }

    if (!subscriptionStatus) {
      return { handled: false, reason: 'Unsupported event type' };
    }

    await prisma.business.update({
      where: { id: businessId },
      data: { subscriptionStatus },
    });

    return { handled: true, subscriptionStatus };
  }

  private async mapInvoiceAlert(
    invoice: {
      id: string;
      invoiceNumber: string;
      amount: { toString(): string };
      currency: string;
      billingInterval: BillingInterval | null;
      dueAt: Date;
      alertEndsAt: Date;
      sentAt: Date;
      note: string | null;
      pdfStorageKey: string;
      kind: SubscriptionInvoiceKind;
      status: SubscriptionInvoiceStatus;
      periodEndsAt: Date | null;
    },
  ) {
    const now = Date.now();
    const pdfUrl = await filesModule.getFileReadUrl.execute(invoice.pdfStorageKey);
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      billingInterval: invoice.billingInterval,
      dueAt: invoice.dueAt.toISOString(),
      alertEndsAt: invoice.alertEndsAt.toISOString(),
      sentAt: invoice.sentAt.toISOString(),
      note: invoice.note,
      pdfUrl: pdfUrl.url,
      kind: invoice.kind,
      status: invoice.status,
      periodEndsAt: invoice.periodEndsAt?.toISOString() ?? null,
      daysUntilDue: computeDaysUntil(invoice.dueAt, now),
      alertDaysRemaining: computeDaysUntil(invoice.alertEndsAt, now),
    };
  }

  private async nextInvoiceNumber(businessId: string, sentAt: Date): Promise<string> {
    const year = sentAt.getUTCFullYear();
    const seq = await prisma.subscriptionInvoice.count({
      where: { businessId, sentAt: { gte: new Date(Date.UTC(year, 0, 1)) } },
    });
    return `INV-${year}-${String(seq + 1).padStart(4, '0')}`;
  }

  async getActiveSubscriptionInvoiceAlert(businessId: string) {
    const now = new Date();
    const invoice = await prisma.subscriptionInvoice.findFirst({
      where: {
        businessId,
        kind: SubscriptionInvoiceKind.PAYMENT_REQUEST,
        status: SubscriptionInvoiceStatus.OPEN,
        alertEndsAt: { gt: now },
      },
      orderBy: { sentAt: 'desc' },
    });
    if (!invoice) return null;
    return this.mapInvoiceAlert(invoice);
  }

  async getActivePurchaseReceiptAlert(businessId: string) {
    const now = new Date();
    const invoice = await prisma.subscriptionInvoice.findFirst({
      where: {
        businessId,
        kind: SubscriptionInvoiceKind.PURCHASE_RECEIPT,
        status: SubscriptionInvoiceStatus.PAID,
        alertEndsAt: { gt: now },
      },
      orderBy: { sentAt: 'desc' },
    });
    if (!invoice) return null;
    return this.mapInvoiceAlert(invoice);
  }

  async getLatestPurchaseReceipt(businessId: string) {
    const invoice = await prisma.subscriptionInvoice.findFirst({
      where: {
        businessId,
        kind: SubscriptionInvoiceKind.PURCHASE_RECEIPT,
        status: SubscriptionInvoiceStatus.PAID,
      },
      orderBy: { sentAt: 'desc' },
    });
    if (!invoice) return null;
    return this.mapInvoiceAlert(invoice);
  }

  async getSubscriptionInvoiceForTenant(businessId: string, invoiceId: string) {
    const invoice = await prisma.subscriptionInvoice.findFirst({
      where: { id: invoiceId, businessId },
    });
    if (!invoice) throw new Error('Invoice not found');
    return this.mapInvoiceAlert(invoice);
  }

  async listSubscriptionInvoicesForBusiness(businessId: string, limit = 25) {
    const invoices = await prisma.subscriptionInvoice.findMany({
      where: { businessId },
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
    const now = Date.now();
    return Promise.all(
      invoices.map(async (invoice) => {
        const mapped = await this.mapInvoiceAlert(invoice);
        return {
          ...mapped,
          alertActive: invoice.alertEndsAt.getTime() > now,
        };
      }),
    );
  }

  async dismissInvoiceAlert(
    businessId: string,
    invoiceId: string,
    options?: { userPermissions?: string[] },
  ) {
    const invoice = await prisma.subscriptionInvoice.findFirst({
      where: { id: invoiceId, businessId },
    });
    if (!invoice) throw new Error('Invoice not found');

    if (invoice.kind === SubscriptionInvoiceKind.PAYMENT_REQUEST) {
      const perms = options?.userPermissions ?? [];
      const canManage = perms.includes('*') || perms.includes('business.manage');
      if (!canManage) {
        throw new ForbiddenError('Only managers can hide payment invoice reminders');
      }
    }
    const now = new Date();
    if (invoice.alertEndsAt.getTime() <= now.getTime()) {
      return { dismissed: true, invoiceId };
    }
    await prisma.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: { alertEndsAt: now },
    });
    return { dismissed: true, invoiceId };
  }

  async sendSubscriptionInvoice(
    businessId: string,
    platformUserId: string,
    input: {
      amount?: number;
      interval?: BillingInterval;
      dueInDays: number;
      alertDays: number;
      note?: string;
    },
  ) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new BusinessNotFoundError();

    const settings = await billingSettingsRepository.getOrCreate();
    const currency = settings.currency;
    let amount = input.amount;
    let interval = input.interval ?? null;
    if (
      !interval &&
      business.billingInterval &&
      (business.subscriptionStatus === 'ACTIVE' || business.subscriptionStatus === 'PAST_DUE')
    ) {
      interval = business.billingInterval;
    }
    if (interval && amount == null) {
      amount =
        interval === 'MONTHLY'
          ? decimalToNumber(settings.monthlyPrice)
          : decimalToNumber(settings.yearlyPrice);
    }
    if (amount == null || amount <= 0) {
      throw new Error('Invoice amount is required');
    }

    const sentAt = new Date();
    const dueAt = new Date(sentAt);
    dueAt.setDate(dueAt.getDate() + input.dueInDays);
    const alertEndsAt = new Date(sentAt);
    alertEndsAt.setDate(alertEndsAt.getDate() + input.alertDays);

    const invoiceNumber = await this.nextInvoiceNumber(businessId, sentAt);

    const pdfBuffer = await buildSubscriptionInvoicePdf({
      invoiceNumber,
      businessName: business.name,
      businessSlug: business.slug,
      amount,
      currency,
      billingInterval: interval,
      dueAt,
      sentAt,
      variant: 'payment_request',
      note: input.note,
      bankName: settings.bankName,
      accountTitle: settings.accountTitle,
      accountNumber: settings.accountNumber,
      iban: settings.iban,
      swiftCode: settings.swiftCode,
      paymentInstructions: settings.paymentInstructions,
    });

    const uploaded = await fileStorageService.upload({
      businessId,
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      originalName: `${invoiceNumber}.pdf`,
      folder: 'subscription-invoices',
    });

    const invoice = await prisma.$transaction(async (tx) => {
      await tx.subscriptionInvoice.updateMany({
        where: {
          businessId,
          status: SubscriptionInvoiceStatus.OPEN,
          kind: SubscriptionInvoiceKind.PAYMENT_REQUEST,
        },
        data: { status: SubscriptionInvoiceStatus.CANCELLED },
      });

      return tx.subscriptionInvoice.create({
        data: {
          businessId,
          invoiceNumber,
          amount,
          currency,
          billingInterval: interval,
          dueAt,
          alertDays: input.alertDays,
          alertEndsAt,
          pdfStorageKey: uploaded.key,
          note: input.note?.trim() || null,
          kind: SubscriptionInvoiceKind.PAYMENT_REQUEST,
          status: SubscriptionInvoiceStatus.OPEN,
          sentById: platformUserId,
          sentAt,
        },
      });
    });

    return this.mapInvoiceAlert(invoice);
  }

  async issuePurchaseReceiptForSubmission(submissionId: string, platformUserId: string) {
    const submission = await prisma.paymentSubmission.findUnique({
      where: { id: submissionId },
      include: { business: true },
    });
    if (!submission || submission.status !== 'APPROVED') {
      throw new Error('Approved payment submission not found');
    }

    const existing = await prisma.subscriptionInvoice.findFirst({
      where: { paymentSubmissionId: submissionId },
    });
    if (existing) return this.mapInvoiceAlert(existing);

    const business = submission.business;
    const periodEndsAt = business.subscriptionEndsAt ?? addIntervalEnd(submission.reviewedAt ?? new Date(), submission.interval);

    return this.createPurchaseReceipt({
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      amount: decimalToNumber(submission.amount),
      interval: submission.interval,
      periodEndsAt,
      paymentSubmissionId: submissionId,
      platformUserId,
      note: `Thank you for subscribing to ${APP_NAME}.`,
    });
  }

  async sendPurchaseReceipt(
    businessId: string,
    platformUserId: string,
    input?: { paymentSubmissionId?: string; note?: string; alertDays?: number },
  ) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new BusinessNotFoundError();

    if (input?.paymentSubmissionId) {
      const submission = await prisma.paymentSubmission.findFirst({
        where: { id: input.paymentSubmissionId, businessId, status: 'APPROVED' },
      });
      if (!submission) throw new Error('Approved payment submission not found for this tenant');
      return this.issuePurchaseReceiptForSubmission(submission.id, platformUserId);
    }

    if (business.subscriptionStatus !== 'ACTIVE' && business.subscriptionStatus !== 'PAST_DUE') {
      throw new Error('Purchase receipts are for tenants with an active paid subscription');
    }
    if (!business.billingInterval) {
      throw new Error('Tenant has no billing plan on file');
    }

    const settings = await billingSettingsRepository.getOrCreate();
    const amount =
      business.billingInterval === 'MONTHLY'
        ? decimalToNumber(settings.monthlyPrice)
        : decimalToNumber(settings.yearlyPrice);

    return this.createPurchaseReceipt({
      businessId,
      businessName: business.name,
      businessSlug: business.slug,
      amount,
      interval: business.billingInterval,
      periodEndsAt: business.subscriptionEndsAt,
      paymentSubmissionId: null,
      platformUserId,
      note: input?.note?.trim() || `Thank you for subscribing to ${APP_NAME}.`,
      alertDays: input?.alertDays,
    });
  }

  private async createPurchaseReceipt(params: {
    businessId: string;
    businessName: string;
    businessSlug: string;
    amount: number;
    interval: BillingInterval;
    periodEndsAt: Date | null;
    paymentSubmissionId: string | null;
    platformUserId: string;
    note?: string;
    alertDays?: number;
  }) {
    const settings = await billingSettingsRepository.getOrCreate();
    const currency = settings.currency;
    const sentAt = new Date();
    const dueAt = sentAt;
    const alertDays =
      params.alertDays != null ? params.alertDays : PURCHASE_RECEIPT_ALERT_DAYS;
    const alertEndsAt = new Date(sentAt);
    if (alertDays > 0) {
      alertEndsAt.setDate(alertEndsAt.getDate() + alertDays);
    }

    const invoiceNumber = await this.nextInvoiceNumber(params.businessId, sentAt);

    const pdfBuffer = await buildSubscriptionInvoicePdf({
      invoiceNumber,
      businessName: params.businessName,
      businessSlug: params.businessSlug,
      amount: params.amount,
      currency,
      billingInterval: params.interval,
      dueAt,
      sentAt,
      periodEndsAt: params.periodEndsAt,
      variant: 'purchase_receipt',
      note: params.note,
    });

    const uploaded = await fileStorageService.upload({
      businessId: params.businessId,
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      originalName: `${invoiceNumber}.pdf`,
      folder: 'subscription-invoices',
    });

    const invoice = await prisma.subscriptionInvoice.create({
      data: {
        businessId: params.businessId,
        invoiceNumber,
        amount: params.amount,
        currency,
        billingInterval: params.interval,
        dueAt,
        alertDays,
        alertEndsAt,
        pdfStorageKey: uploaded.key,
        note: params.note?.trim() || null,
        kind: SubscriptionInvoiceKind.PURCHASE_RECEIPT,
        status: SubscriptionInvoiceStatus.PAID,
        periodEndsAt: params.periodEndsAt,
        paymentSubmissionId: params.paymentSubmissionId,
        sentById: params.platformUserId,
        sentAt,
      },
    });

    return this.mapInvoiceAlert(invoice);
  }
}

export const billingService = new BillingService();
