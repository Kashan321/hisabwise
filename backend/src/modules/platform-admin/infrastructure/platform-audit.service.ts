import { PrismaPlatformAuditLogRepository } from './persistence/prisma-platform-audit-log.repository';

const auditLogRepository = new PrismaPlatformAuditLogRepository();

export async function writePlatformAudit(input: {
  platformUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  await auditLogRepository.create(input);
}
