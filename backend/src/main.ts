import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { getRawPrismaClient } from './shared/database/prisma-client';
import { checkOfflinePrismaDelegates } from './shared/database/verify-offline-prisma';
import { logger } from './shared/logger/logger';
import { ensureSystemRolesAndPermissions } from './shared/rbac/system-roles';
import { attachTenantWebSocket } from './shared/ws/tenant-realtime';

async function bootstrap() {
  await ensureSystemRolesAndPermissions(getRawPrismaClient());

  const offlinePrisma = checkOfflinePrismaDelegates();
  if (!offlinePrisma.ok) {
    logger.error(
      {
        missingDelegates: offlinePrisma.missingDelegates,
        hint: 'Run in backend/: npx prisma db push && npx prisma generate',
      },
      'Prisma client is missing offline POS models — offline sync will return errors until regenerated',
    );
  } else {
    logger.info('Offline POS Prisma models OK (posDevice delegate present)');
  }

  const server = createServer(app);
  attachTenantWebSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`Server listening on http://localhost:${env.PORT}`);
    logger.info(`Tenant WebSocket on ws://localhost:${env.PORT}/ws/tenant`);
  });
}

bootstrap().catch((error) => {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
});
