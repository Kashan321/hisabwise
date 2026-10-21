import { prisma } from '../../../../shared/database/prisma-client';

/** Returns the open daily inventory session id for a business, if any. */
export async function resolveOpenDailySessionId(businessId: string): Promise<string | null> {
  const session = await prisma.inventoryDailySession.findFirst({
    where: { businessId, status: 'OPEN' },
    select: { id: true },
    orderBy: { openedAt: 'desc' },
  });
  return session?.id ?? null;
}
