import { NextFunction, Request, RequestHandler, Response } from 'express';
import { runWithTenantContext } from '../tenant-context/tenant-context';

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    const execute = () => handler(req, res, next).catch(next);

    if (req.tenantContext) {
      runWithTenantContext(req.tenantContext, execute);
      return;
    }

    execute();
  };
}
