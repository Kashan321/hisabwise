import { prisma } from '../../../../shared/database/prisma-client';
import { NotificationRepository } from '../../domain/repositories/notification.repository';

export class PrismaNotificationRepository implements NotificationRepository {
  async findAll(
    businessId: string,
    channel?: 'EMAIL' | 'SMS',
    status?: 'PENDING' | 'SENT' | 'FAILED',
  ) {
    const logs = await prisma.notificationLog.findMany({
      where: {
        businessId,
        ...(channel ? { channel } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return logs.map((log) => ({
      ...log,
      payload: log.payload ?? null,
    }));
  }
}
