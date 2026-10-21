import { Router } from 'express';
import { apiRunningMessage } from '../../config/branding';
import { ErrorCodes } from '../errors/error-codes';
import { fail, success } from './api-response';
import { API_BASE_PATH, buildProjectInfo } from './project-info';

export function createApiRouter(api: Router): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    return success(res, { status: 'ok', uptime: process.uptime() });
  });

  router.get('/', (_req, res) => {
    return success(res, buildProjectInfo());
  });

  router.use(api);

  router.use((req, res) => {
    return fail(
      res,
      ErrorCodes.NOT_FOUND,
      `No API route for ${req.method} ${req.path}`,
      404,
    );
  });

  return router;
}

export function registerRootRoutes(app: import('express').Express) {
  app.get('/', (_req, res) => {
    return success(res, {
      ...buildProjectInfo(),
      message: apiRunningMessage(),
    });
  });

  app.get('/api', (_req, res) => {
    return success(res, {
      versions: ['v1'],
      current: API_BASE_PATH,
      message: `Use ${API_BASE_PATH} for the current API.`,
    });
  });
}
