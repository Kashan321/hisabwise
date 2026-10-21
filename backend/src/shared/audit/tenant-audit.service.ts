import { prisma } from '../database/prisma-client';

export interface TenantAuditInput {
  businessId: string;
  userId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export class TenantAuditService {
  async log(input: TenantAuditInput) {
    return prisma.tenantAuditLog.create({
      data: {
        businessId: input.businessId,
        userId: input.userId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: input.metadata,
      },
    });
  }

  async list(
    businessId: string,
    options?: { limit?: number; offset?: number; targetType?: string; userId?: string },
  ) {
    const where = {
      businessId,
      ...(options?.targetType ? { targetType: options.targetType } : {}),
      ...(options?.userId ? { userId: options.userId } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.tenantAuditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      prisma.tenantAuditLog.count({ where }),
    ]);

    return { logs, total };
  }
}

export const tenantAuditService = new TenantAuditService();
