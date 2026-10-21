/**
 * Backfill business_days from historical orders grouped by ticket_prefix date segment.
 * Run: npx tsx prisma/scripts/backfill-business-days.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseTicketDateFromPrefix(prefix: string | null): string | null {
  if (!prefix) return null;
  const match = prefix.match(/-(\d{6})$/);
  if (!match) return null;
  const seg = match[1];
  const yy = seg.slice(0, 2);
  const mm = seg.slice(2, 4);
  const dd = seg.slice(4, 6);
  const year = 2000 + parseInt(yy, 10);
  return `${year}-${mm}-${dd}`;
}

async function main() {
  const businesses = await prisma.business.findMany({
    select: { id: true, slug: true },
  });

  for (const business of businesses) {
    const owner = await prisma.user.findFirst({
      where: { businessId: business.id, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!owner) continue;

    const orders = await prisma.order.findMany({
      where: {
        businessId: business.id,
        ticketNumber: { not: null },
        ticketPrefix: { not: null },
      },
      select: {
        id: true,
        ticketNumber: true,
        ticketPrefix: true,
        cashShiftId: true,
        createdAt: true,
      },
    });

    const groups = new Map<string, typeof orders>();
    for (const order of orders) {
      const dateKey =
        parseTicketDateFromPrefix(order.ticketPrefix) ??
        order.createdAt.toISOString().slice(0, 10);
      const list = groups.get(dateKey) ?? [];
      list.push(order);
      groups.set(dateKey, list);
    }

    for (const [dateKey, groupOrders] of groups) {
      const businessDate = new Date(`${dateKey}T00:00:00.000Z`);
      const startedAt = groupOrders.reduce(
        (min, o) => (o.createdAt < min ? o.createdAt : min),
        groupOrders[0].createdAt,
      );
      const endedAt = groupOrders.reduce(
        (max, o) => (o.createdAt > max ? o.createdAt : max),
        groupOrders[0].createdAt,
      );
      const maxSeq = groupOrders.reduce(
        (max, o) => Math.max(max, o.ticketNumber ?? 0),
        0,
      );

      const day = await prisma.businessDay.upsert({
        where: {
          businessId_businessDate: { businessId: business.id, businessDate },
        },
        create: {
          businessId: business.id,
          businessDate,
          startedAt,
          endedAt,
          status: 'CLOSED',
          lastOrderSequence: maxSeq,
          openedById: owner.id,
          closedById: owner.id,
        },
        update: {
          endedAt,
          lastOrderSequence: maxSeq,
          status: 'CLOSED',
        },
      });

      await prisma.order.updateMany({
        where: { id: { in: groupOrders.map((o) => o.id) } },
        data: { businessDayId: day.id },
      });

      const shiftIds = [
        ...new Set(groupOrders.map((o) => o.cashShiftId).filter(Boolean)),
      ] as string[];
      if (shiftIds.length > 0) {
        await prisma.cashShift.updateMany({
          where: { id: { in: shiftIds }, businessDayId: null },
          data: { businessDayId: day.id },
        });
      }
    }

    console.log(`Backfilled ${groups.size} business days for ${business.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
