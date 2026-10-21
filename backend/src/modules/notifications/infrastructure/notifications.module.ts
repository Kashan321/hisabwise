import { ListNotificationLogsUseCase } from '../application/use-cases/list-notification-logs.use-case';
import { PrismaNotificationRepository } from './persistence/prisma-notification.repository';
import { registerInboxNotificationListeners } from './listeners/inbox.listeners';
import { registerNotificationListeners } from './listeners/notification.listeners';

const notificationRepository = new PrismaNotificationRepository();

export const notificationsModule = {
  listLogs: new ListNotificationLogsUseCase(notificationRepository),
};

registerNotificationListeners();
registerInboxNotificationListeners();
