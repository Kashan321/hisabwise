import { prisma } from '../../../shared/database/prisma-client';
import {
  assertDateRange,
  isCalendarDateInRange,
  platformCalendarToday,
} from '../../../shared/time/calendar-date';

export type TenantAlertRecord = {
  id: string;
  bodyText: string;
  linkUrl: string | null;
  linkLabel: string | null;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function mapAlert(row: {
  id: string;
  bodyText: string;
  linkUrl: string | null;
  linkLabel: string | null;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TenantAlertRecord {
  return {
    id: row.id,
    bodyText: row.bodyText,
    linkUrl: row.linkUrl,
    linkLabel: row.linkLabel,
    imageUrl: row.imageUrl,
    startDate: row.startDate,
    endDate: row.endDate,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class TenantAlertsService {
  async listForPlatform(): Promise<TenantAlertRecord[]> {
    const rows = await prisma.platformTenantAlert.findMany({
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(mapAlert);
  }

  async create(input: {
    bodyText: string;
    linkUrl?: string | null;
    linkLabel?: string | null;
    imageUrl?: string | null;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }): Promise<TenantAlertRecord> {
    assertDateRange(input.startDate, input.endDate);
    const row = await prisma.platformTenantAlert.create({
      data: {
        bodyText: input.bodyText.trim(),
        linkUrl: input.linkUrl?.trim() || null,
        linkLabel: input.linkLabel?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        startDate: input.startDate,
        endDate: input.endDate,
        isActive: input.isActive,
      },
    });
    return mapAlert(row);
  }

  async update(
    id: string,
    input: Partial<{
      bodyText: string;
      linkUrl: string | null;
      linkLabel: string | null;
      imageUrl: string | null;
      startDate: string;
      endDate: string;
      isActive: boolean;
    }>,
  ): Promise<TenantAlertRecord> {
    const existing = await prisma.platformTenantAlert.findUnique({ where: { id } });
    if (!existing) throw new Error('NOT_FOUND');

    const startDate = input.startDate ?? existing.startDate;
    const endDate = input.endDate ?? existing.endDate;
    assertDateRange(startDate, endDate);

    const row = await prisma.platformTenantAlert.update({
      where: { id },
      data: {
        ...(input.bodyText !== undefined ? { bodyText: input.bodyText.trim() } : {}),
        ...(input.linkUrl !== undefined ? { linkUrl: input.linkUrl?.trim() || null } : {}),
        ...(input.linkLabel !== undefined ? { linkLabel: input.linkLabel?.trim() || null } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl?.trim() || null } : {}),
        ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    return mapAlert(row);
  }

  async delete(id: string): Promise<void> {
    const existing = await prisma.platformTenantAlert.findUnique({ where: { id } });
    if (!existing) throw new Error('NOT_FOUND');
    await prisma.platformTenantAlert.delete({ where: { id } });
  }

  async getCurrentForUser(userId: string): Promise<TenantAlertRecord | null> {
    const today = platformCalendarToday();
    const candidates = await prisma.platformTenantAlert.findMany({
      where: {
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const alert of candidates) {
      if (!isCalendarDateInRange(today, alert.startDate, alert.endDate)) continue;
      const dismissed = await prisma.tenantAlertDismissal.findUnique({
        where: {
          alertId_userId_dismissOn: {
            alertId: alert.id,
            userId,
            dismissOn: today,
          },
        },
      });
      if (!dismissed) return mapAlert(alert);
    }
    return null;
  }

  async dismissForUser(userId: string, alertId: string): Promise<void> {
    const alert = await prisma.platformTenantAlert.findUnique({ where: { id: alertId } });
    if (!alert) throw new Error('NOT_FOUND');

    const today = platformCalendarToday();
    if (!alert.isActive || !isCalendarDateInRange(today, alert.startDate, alert.endDate)) {
      return;
    }

    await prisma.tenantAlertDismissal.upsert({
      where: {
        alertId_userId_dismissOn: {
          alertId,
          userId,
          dismissOn: today,
        },
      },
      create: { alertId, userId, dismissOn: today },
      update: {},
    });
  }
}

export const tenantAlertsService = new TenantAlertsService();
