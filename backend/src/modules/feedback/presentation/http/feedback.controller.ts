import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { success } from '../../../../shared/http/api-response';
import { feedbackService } from '../../infrastructure/feedback.service';
import { listPlatformFeedbackQuerySchema } from './feedback.validators';

type ListPlatformFeedbackQuery = z.infer<typeof listPlatformFeedbackQuerySchema>;

export class FeedbackController {
  getContact = asyncHandler(async (_req: Request, res: Response) => {
    const contact = await feedbackService.getContactSettings();
    return success(res, { contact });
  });

  listTickets = asyncHandler(async (req: Request, res: Response) => {
    const tickets = await feedbackService.listTenantTickets(req.tenantContext!.businessId);
    return success(res, { tickets });
  });

  createTicket = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await feedbackService.createTicket(
      req.tenantContext!.businessId,
      req.tenantContext!.userId,
      req.body,
    );
    return success(res, { ticket }, 201);
  });
}

export class PlatformFeedbackController {
  getContactSettings = asyncHandler(async (_req: Request, res: Response) => {
    const contact = await feedbackService.getContactSettings();
    return success(res, { contact });
  });

  updateContactSettings = asyncHandler(async (req: Request, res: Response) => {
    const contact = await feedbackService.updateContactSettings(req.body);
    return success(res, { contact });
  });

  listTickets = asyncHandler(async (req: Request, res: Response) => {
    const { status, businessId } = req.validatedQuery as ListPlatformFeedbackQuery;
    const tickets = await feedbackService.listPlatformTickets({ status, businessId });
    return success(res, { tickets });
  });

  resolveTicket = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await feedbackService.reviewTicket(
      String(req.params.id),
      req.platformContext!.platformUserId,
      'resolve',
      req.body.adminNote,
    );
    return success(res, { ticket });
  });

  rejectTicket = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await feedbackService.reviewTicket(
      String(req.params.id),
      req.platformContext!.platformUserId,
      'reject',
      req.body.adminNote,
    );
    return success(res, { ticket });
  });
}

export const feedbackController = new FeedbackController();
export const platformFeedbackController = new PlatformFeedbackController();
