import { Prisma } from '@prisma/client';
import { getRawPrismaClient } from '../../../../shared/database/prisma-client';
import { PlatformAuditLogRepository } from '../../domain/repositories/platform-audit-log.repository';

export class PrismaPlatformAuditLogRepository implements PlatformAuditLogRepository {
  private readonly prisma = getRawPrismaClient();

  async create(input: {
    platformUserId: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.platformAuditLog.create({
      data: {
        platformUserId: input.platformUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async list(limit = 100) {
    return this.prisma.platformAuditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        platformUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }
}
