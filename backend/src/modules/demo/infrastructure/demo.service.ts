import { DemoRequestSource, DemoRequestStatus } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma-client';
import { billingSettingsRepository } from '../../billing/infrastructure/billing-settings.repository';
import { platformSettingsRepository } from '../../platform-admin/infrastructure/platform-settings.repository';

function decimalToNumber(value: { toString(): string }): number {
  return Number(value.toString());
}

const demoInclude = {
  reviewedBy: { select: { id: true, name: true, email: true } },
};

function mapDemoRequest(request: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  scheduledAt: Date | null;
  eventName: string | null;
  calendlyInviteeUri: string | null;
  status: DemoRequestStatus;
  source: DemoRequestSource;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reviewedBy?: { id: string; name: string; email: string } | null;
}) {
  return {
    id: request.id,
    name: request.name,
    email: request.email,
    phone: request.phone,
    company: request.company,
    scheduledAt: request.scheduledAt,
    eventName: request.eventName,
    calendlyInviteeUri: request.calendlyInviteeUri,
    status: request.status,
    source: request.source,
    adminNote: request.adminNote,
    reviewedById: request.reviewedById,
    reviewedAt: request.reviewedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    reviewedByName: request.reviewedBy?.name ?? null,
  };
}

export class DemoService {
  async getPublicPricing() {
    const settings = await billingSettingsRepository.getOrCreate();
    const monthlyPrice = decimalToNumber(settings.monthlyPrice);
    const yearlyPrice = decimalToNumber(settings.yearlyPrice);
    const yearlyMonthlyEquivalent =
      yearlyPrice > 0 ? Math.round((yearlyPrice / 12) * 100) / 100 : 0;
    const savingsPercent =
      monthlyPrice > 0 && yearlyPrice > 0
        ? Math.max(0, Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100))
        : 0;

    return {
      defaultTrialDays: settings.defaultTrialDays,
      currency: settings.currency,
      plans: {
        monthly: {
          interval: 'MONTHLY' as const,
          price: monthlyPrice,
          currency: settings.currency,
        },
        yearly: {
          interval: 'YEARLY' as const,
          price: yearlyPrice,
          currency: settings.currency,
          monthlyEquivalent: yearlyMonthlyEquivalent,
          savingsPercent,
        },
      },
    };
  }

  async getPublicDemoConfig() {
    const settings = await platformSettingsRepository.getOrCreate();
    return {
      calendlyUrl: settings.calendlyUrl,
    };
  }

  async createRequest(data: {
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
    scheduledAt?: Date | null;
    eventName?: string | null;
    calendlyInviteeUri?: string | null;
    source?: DemoRequestSource;
  }) {
    if (data.calendlyInviteeUri) {
      const existing = await prisma.demoRequest.findUnique({
        where: { calendlyInviteeUri: data.calendlyInviteeUri },
      });
      if (existing) return mapDemoRequest(existing);
    }

    const request = await prisma.demoRequest.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        company: data.company ?? null,
        scheduledAt: data.scheduledAt ?? null,
        eventName: data.eventName ?? null,
        calendlyInviteeUri: data.calendlyInviteeUri ?? null,
        source: data.source ?? 'MANUAL',
        status: data.scheduledAt ? 'SCHEDULED' : 'PENDING',
      },
      include: demoInclude,
    });

    return mapDemoRequest(request);
  }

  async handleCalendlyWebhook(payload: Record<string, unknown>) {
    const event = String(payload.event ?? '');
    const invitee = (payload.payload ?? payload) as Record<string, unknown>;
    const scheduledEvent = invitee.scheduled_event as Record<string, unknown> | undefined;

    if (event === 'invitee.canceled') {
      const uri = String(invitee.uri ?? '');
      if (!uri) return null;
      const existing = await prisma.demoRequest.findUnique({ where: { calendlyInviteeUri: uri } });
      if (!existing) return null;
      const updated = await prisma.demoRequest.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED' },
        include: demoInclude,
      });
      return mapDemoRequest(updated);
    }

    if (event !== 'invitee.created') return null;

    const scheduledAt = scheduledEvent?.start_time
      ? new Date(String(scheduledEvent.start_time))
      : null;

    return this.createRequest({
      name: String(invitee.name ?? 'Unknown'),
      email: String(invitee.email ?? ''),
      phone: invitee.text_reminder_number ? String(invitee.text_reminder_number) : null,
      scheduledAt,
      eventName: scheduledEvent?.name ? String(scheduledEvent.name) : null,
      calendlyInviteeUri: invitee.uri ? String(invitee.uri) : null,
      source: 'CALENDLY',
    });
  }

  async listPlatformRequests(filters?: { status?: DemoRequestStatus }) {
    const requests = await prisma.demoRequest.findMany({
      where: filters?.status ? { status: filters.status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: demoInclude,
    });
    return requests.map(mapDemoRequest);
  }

  async updateRequestStatus(
    requestId: string,
    platformUserId: string,
    status: DemoRequestStatus,
    adminNote?: string,
  ) {
    const request = await prisma.demoRequest.update({
      where: { id: requestId },
      data: {
        status,
        adminNote: adminNote ?? undefined,
        reviewedById: platformUserId,
        reviewedAt: new Date(),
      },
      include: demoInclude,
    });
    return mapDemoRequest(request);
  }
}

export const demoService = new DemoService();
