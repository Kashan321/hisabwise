export interface PlatformAuditLogRepository {
  create(input: {
    platformUserId: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  list(limit?: number): Promise<
    Array<{
      id: string;
      action: string;
      targetType: string;
      targetId: string | null;
      metadata: unknown;
      createdAt: Date;
      platformUser: { id: string; name: string; email: string; role: string };
    }>
  >;
}
