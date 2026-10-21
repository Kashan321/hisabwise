import { NotificationRepository } from '../../domain/repositories/notification.repository';

export class ListNotificationLogsUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  execute(
    businessId: string,
    channel?: 'EMAIL' | 'SMS',
    status?: 'PENDING' | 'SENT' | 'FAILED',
  ) {
    return this.notificationRepository.findAll(businessId, channel, status);
  }
}
