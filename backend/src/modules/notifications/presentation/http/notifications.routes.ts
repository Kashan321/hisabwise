import { Router } from 'express';
import { requireAuth, requirePermission } from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { validateQuery } from '../../../../shared/http/validate-query.middleware';
import { notificationsController } from './notifications.controller';
import {
  listInboxNotificationsQuerySchema,
  listNotificationLogsQuerySchema,
  updateNotificationPreferencesSchema,
} from './notifications.validators';

export const notificationsRouter = Router();

notificationsRouter.get(
  '/logs',
  requireAuth,
  requirePermission('notifications.view'),
  validateQuery(listNotificationLogsQuerySchema),
  notificationsController.listLogs,
);

notificationsRouter.get(
  '/inbox',
  requireAuth,
  validateQuery(listInboxNotificationsQuerySchema),
  notificationsController.listInbox,
);

notificationsRouter.post('/inbox/self-test', requireAuth, notificationsController.createSelfTest);

notificationsRouter.get('/inbox/:id', requireAuth, notificationsController.getInboxItem);

notificationsRouter.post('/inbox/:id/read', requireAuth, notificationsController.markInboxRead);

notificationsRouter.post('/inbox/read-all', requireAuth, notificationsController.markAllInboxRead);

notificationsRouter.get('/preferences', requireAuth, notificationsController.getPreferences);

notificationsRouter.patch(
  '/preferences',
  requireAuth,
  validateBody(updateNotificationPreferencesSchema),
  notificationsController.updatePreferences,
);
