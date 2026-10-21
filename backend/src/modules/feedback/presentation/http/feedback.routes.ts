import { Router } from 'express';
import {
  requireAuth,
  requirePermission,
} from '../../../auth/presentation/middlewares/require-auth.middleware';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { feedbackController } from './feedback.controller';
import { createFeedbackTicketSchema } from './feedback.validators';

const canManage = requirePermission('feedback.manage');

export const feedbackRouter = Router();

feedbackRouter.get('/contact', requireAuth, canManage, feedbackController.getContact);

feedbackRouter.get('/tickets', requireAuth, canManage, feedbackController.listTickets);

feedbackRouter.post(
  '/tickets',
  requireAuth,
  canManage,
  validateBody(createFeedbackTicketSchema),
  feedbackController.createTicket,
);
