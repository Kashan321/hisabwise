import type { Prisma } from '@prisma/client';
import { BusinessDayNotOpenError } from '../../../business-day/domain/errors/business-day.errors';
import { formatBusinessDateSuffix } from '../../../../shared/date/business-day-resolver';
import { resolveTicketPrefix } from '../../../../shared/ticket/ticket-prefix';

/** Full order label, e.g. KB-260917-001 (prefix already includes the date segment). */
export function formatOrderTicketLabel(prefix: string, ticketNumber: number): string {
  const normalizedPrefix = prefix.trim().toUpperCase() || 'TKT';
  return `${normalizedPrefix}-${String(ticketNumber).padStart(3, '0')}`;
}

export async function getOpenBusinessDayId(
  tx: Prisma.TransactionClient,
  businessId: string,
): Promise<string> {
  const openDay = await tx.businessDay.findFirst({
    where: { businessId, status: 'OPEN' },
    orderBy: { startedAt: 'desc' },
    select: { id: true },
  });
  if (!openDay) throw new BusinessDayNotOpenError();
  return openDay.id;
}

export async function resolveOrderShiftContext(
  tx: Prisma.TransactionClient,
  businessId: string,
): Promise<{ businessDayId: string; cashShiftId: string | null }> {
  const businessDayId = await getOpenBusinessDayId(tx, businessId);
  const openShift = await tx.cashShift.findFirst({
    where: { businessId, status: 'OPEN' },
    select: { id: true },
    orderBy: { openedAt: 'desc' },
  });
  return { businessDayId, cashShiftId: openShift?.id ?? null };
}

export async function allocateOrderTicketNumber(
  tx: Prisma.TransactionClient,
  businessId: string,
): Promise<{ ticketNumber: number; ticketPrefix: string; businessDayId: string }> {
  const openDay = await tx.businessDay.findFirst({
    where: { businessId, status: 'OPEN' },
    orderBy: { startedAt: 'desc' },
    select: { id: true },
  });
  if (!openDay) throw new BusinessDayNotOpenError();

  const business = await tx.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { slug: true, orderTicketPrefix: true },
  });

  const updated = await tx.businessDay.update({
    where: { id: openDay.id },
    data: { lastOrderSequence: { increment: 1 } },
    select: { lastOrderSequence: true, businessDate: true },
  });

  const ticketNumber = updated.lastOrderSequence;
  const businessDateKey = updated.businessDate.toISOString().slice(0, 10);
  const businessPrefix = resolveTicketPrefix(business.slug, business.orderTicketPrefix);
  const ticketPrefix = `${businessPrefix}-${formatBusinessDateSuffix(businessDateKey)}`;

  return { ticketNumber, ticketPrefix, businessDayId: openDay.id };
}
