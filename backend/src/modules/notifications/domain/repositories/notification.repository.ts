export interface NotificationLogEntity {
  id: string;
  businessId: string;
  channel: 'EMAIL' | 'SMS';
  recipient: string;
  template: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  payload: unknown;
  sentAt: Date | null;
  createdAt: Date;
}

export interface NotificationRepository {
  findAll(
    businessId: string,
    channel?: 'EMAIL' | 'SMS',
    status?: 'PENDING' | 'SENT' | 'FAILED',
  ): Promise<NotificationLogEntity[]>;
}
