import { NextFunction, Request, Response } from 'express';
import { runWithTenantContext, TenantContext } from './tenant-context';

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

export function tenantContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.tenantContext) {
    return next();
  }

  runWithTenantContext(req.tenantContext, () => next());
}
