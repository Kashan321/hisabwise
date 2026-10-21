import { Request, Response } from 'express';
import { notificationsModule } from '../../infrastructure/notifications.module';
import { createInboxNotification } from '../../application/services/create-inbox-notification.service';
import { inboxNotificationService } from '../../application/services/inbox-notification.service';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { fail } from '../../../../shared/http/api-response';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class NotificationsController {
  listLogs = asyncHandler(async (req: Request, res: Response) => {
    const logs = await notificationsModule.listLogs.execute(
      req.tenantContext!.businessId,
      req.query.channel as 'EMAIL' | 'SMS' | undefined,
      req.query.status as 'PENDING' | 'SENT' | 'FAILED' | undefined,
    );
    return success(res, { logs });
  });

  listInbox = asyncHandler(async (req: Request, res: Response) => {
    const query = (req.validatedQuery ?? {}) as {
      unreadOnly?: boolean;
      limit?: number;
      cursor?: string;
    };
    const result = await inboxNotificationService.listForUser(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
      query,
    );
    return success(res, result);
  });

  getInboxItem = asyncHandler(async (req: Request, res: Response) => {
    const item = await inboxNotificationService.getForUser(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
      String(req.params.id),
    );
    if (!item) {
      return fail(res, ErrorCodes.NOT_FOUND, 'Notification not found', 404);
    }
    return success(res, { notification: item });
  });

  markInboxRead = asyncHandler(async (req: Request, res: Response) => {
    const item = await inboxNotificationService.markRead(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
      String(req.params.id),
    );
    if (!item) {
      return fail(res, ErrorCodes.NOT_FOUND, 'Notification not found', 404);
    }
    return success(res, { notification: item });
  });

  markAllInboxRead = asyncHandler(async (req: Request, res: Response) => {
    const result = await inboxNotificationService.markAllRead(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
    );
    return success(res, result);
  });

  getPreferences = asyncHandler(async (req: Request, res: Response) => {
    const preferences = await inboxNotificationService.getPreferences(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
    );
    return success(res, { preferences });
  });

  createSelfTest = asyncHandler(async (req: Request, res: Response) => {
    const notification = await createInboxNotification({
      businessId: req.tenantContext!.businessId,
      userId: req.tenantContext!.userId,
      category: 'SYSTEM',
      title: 'Notifications are working',
      body: 'This is a test message. New orders and reservations will appear here automatically.',
      actionLabel: 'Open inbox',
      actionHref: '/notifications',
    });
    return success(res, { notification }, 201);
  });

  updatePreferences = asyncHandler(async (req: Request, res: Response) => {
    const preferences = await inboxNotificationService.updatePreferences(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
      req.body,
    );
    return success(res, { preferences });
  });
}

export const notificationsController = new NotificationsController();
