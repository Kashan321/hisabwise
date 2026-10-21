import {
  FeedbackPriority,
  FeedbackTicketStatus,
  FeedbackTicketType,
} from '@prisma/client';
import { prisma } from '../../../shared/database/prisma-client';
import { filesModule } from '../../files/infrastructure/files.module';
import { feedbackSettingsRepository } from './feedback-settings.repository';

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const ticketInclude = {
  business: { select: { id: true, name: true, slug: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true, email: true } },
};

async function resolveImageUrl(imageKey: string | null): Promise<string | null> {
  if (!imageKey) return null;
  try {
    const result = await filesModule.getFileReadUrl.execute(imageKey);
    return result.url;
  } catch {
    return null;
  }
}

function mapTicket(ticket: {
  id: string;
  businessId: string;
  createdById: string;
  type: FeedbackTicketType;
  priority: FeedbackPriority;
  subject: string | null;
  message: string;
  imageKey: string | null;
  status: FeedbackTicketStatus;
  adminNote: string | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  business?: { id: string; name: string; slug: string };
  createdBy?: { id: string; name: string; email: string };
  reviewedBy?: { id: string; name: string; email: string } | null;
  imageUrl?: string | null;
}) {
  return {
    id: ticket.id,
    businessId: ticket.businessId,
    createdById: ticket.createdById,
    type: ticket.type,
    priority: ticket.priority,
    subject: ticket.subject,
    message: ticket.message,
    imageKey: ticket.imageKey,
    imageUrl: ticket.imageUrl ?? null,
    status: ticket.status,
    adminNote: ticket.adminNote,
    reviewedById: ticket.reviewedById,
    reviewedAt: ticket.reviewedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    businessName: ticket.business?.name ?? null,
    businessSlug: ticket.business?.slug ?? null,
    createdByName: ticket.createdBy?.name ?? null,
    createdByEmail: ticket.createdBy?.email ?? null,
    reviewedByName: ticket.reviewedBy?.name ?? null,
  };
}

export class FeedbackService {
  async getContactSettings() {
    const settings = await feedbackSettingsRepository.getOrCreate();
    return {
      email: settings.email,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      websiteUrl: settings.websiteUrl,
      supportHours: settings.supportHours,
      extraNote: settings.extraNote,
    };
  }

  async updateContactSettings(data: {
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    websiteUrl?: string | null;
    supportHours?: string | null;
    extraNote?: string | null;
  }) {
    const settings = await feedbackSettingsRepository.update(data);
    return {
      email: settings.email,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      websiteUrl: settings.websiteUrl,
      supportHours: settings.supportHours,
      extraNote: settings.extraNote,
    };
  }

  async listTenantTickets(businessId: string) {
    const tickets = await prisma.feedbackTicket.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: ticketInclude,
    });
    return tickets.map(mapTicket);
  }

  async createTicket(
    businessId: string,
    createdById: string,
    input: {
      type: FeedbackTicketType;
      priority?: FeedbackPriority;
      subject?: string | null;
      message: string;
      imageKey?: string | null;
    },
  ) {
    const wordCount = countWords(input.message);
    if (wordCount > 1000) {
      throw new Error('Message must be 1000 words or fewer');
    }
    if (!input.message.trim()) {
      throw new Error('Message is required');
    }

    const ticket = await prisma.feedbackTicket.create({
      data: {
        businessId,
        createdById,
        type: input.type,
        priority: input.priority ?? 'MEDIUM',
        subject: input.subject?.trim() || null,
        message: input.message.trim(),
        imageKey: input.imageKey ?? null,
      },
      include: ticketInclude,
    });

    return mapTicket(ticket);
  }

  async listPlatformTickets(filters?: { status?: FeedbackTicketStatus; businessId?: string }) {
    const tickets = await prisma.feedbackTicket.findMany({
      where: {
        status: filters?.status,
        businessId: filters?.businessId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: ticketInclude,
    });
    return Promise.all(
      tickets.map(async (ticket) =>
        mapTicket({
          ...ticket,
          imageUrl: await resolveImageUrl(ticket.imageKey),
        }),
      ),
    );
  }

  async reviewTicket(
    ticketId: string,
    platformUserId: string,
    action: 'resolve' | 'reject',
    adminNote?: string,
  ) {
    const ticket = await prisma.feedbackTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new Error('Feedback ticket not found');
    }
    if (ticket.status !== 'OPEN') {
      throw new Error('Feedback ticket already reviewed');
    }

    const updated = await prisma.feedbackTicket.update({
      where: { id: ticketId },
      data: {
        status: action === 'resolve' ? 'RESOLVED' : 'REJECTED',
        adminNote: adminNote?.trim() || null,
        reviewedById: platformUserId,
        reviewedAt: new Date(),
      },
      include: ticketInclude,
    });

    return mapTicket({
      ...updated,
      imageUrl: await resolveImageUrl(updated.imageKey),
    });
  }
}

export const feedbackService = new FeedbackService();
