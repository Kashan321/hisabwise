import { Router } from 'express';
import { z } from 'zod';
import {
  requireAuth,
  requireAnyPermission,
} from '../../modules/auth/presentation/middlewares/require-auth.middleware';
import { validateQuery } from './validate-query.middleware';
import { asyncHandler } from './async-handler';
import { success } from './api-response';
import { tenantAuditService } from '../audit/tenant-audit.service';

const listAuditLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  targetType: z.string().trim().min(1).max(64).optional(),
  userId: z.string().uuid().optional(),
});

const canViewAuditLogs = requireAnyPermission('orders.manage', 'staff.manage');

export const auditRouter = Router();

auditRouter.get(
  '/',
  requireAuth,
  canViewAuditLogs,
  validateQuery(listAuditLogsQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as z.infer<typeof listAuditLogsQuerySchema>;
    const result = await tenantAuditService.list(req.tenantContext!.businessId, query);
    return success(res, { logs: result.logs, meta: { total: result.total } });
  }),
);
