import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { getCorsOrigins } from './config/cors';
import { env } from './config/env';
import { errorHandler } from './shared/http/error-handler.middleware';
import { tenantContextMiddleware } from './shared/tenant-context/tenant-context.middleware';
import { createApiRouter, registerRootRoutes } from './shared/http/api-router';
import { createV1Router } from './shared/http/v1.routes';
import { API_BASE_PATH } from './shared/http/project-info';
import './modules/customers/infrastructure/customers.module';
import './modules/notifications/infrastructure/notifications.module';
import { logger } from './shared/logger/logger';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        const allowedOrigins = getCorsOrigins();
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== 'test',
    }),
  );
  app.use(tenantContextMiddleware);

  registerRootRoutes(app);

  app.use(API_BASE_PATH, createApiRouter(createV1Router()));

  app.use(errorHandler);

  return app;
}

export default createApp();
