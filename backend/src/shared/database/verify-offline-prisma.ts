import { getRawPrismaClient } from './prisma-client';
import { logger } from '../logger/logger';

const OFFLINE_MODEL_DELEGATES = ['posDevice'] as const;

export const OFFLINE_PRISMA_SETUP_MESSAGE =
  'Offline POS database is out of date. From the backend folder run: npx prisma db push && npx prisma generate — then restart the API server.';

export type OfflinePrismaCheckResult = {
  ok: boolean;
  missingDelegates: string[];
};

export function checkOfflinePrismaDelegates(
  client: Record<string, unknown> = getRawPrismaClient() as unknown as Record<string, unknown>,
): OfflinePrismaCheckResult {
  const missingDelegates = OFFLINE_MODEL_DELEGATES.filter(
    (name) => typeof client[name] !== 'object' || client[name] == null,
  );
  return { ok: missingDelegates.length === 0, missingDelegates: [...missingDelegates] };
}

export function assertOfflinePrismaReady(): void {
  const { ok, missingDelegates } = checkOfflinePrismaDelegates();
  if (ok) return;
  logger.error(
  {
      missingDelegates,
      hint: OFFLINE_PRISMA_SETUP_MESSAGE,
    },
    'Prisma client is missing offline POS models (stale generate). Offline sync and device registration will fail.',
  );
  throw new Error(OFFLINE_PRISMA_SETUP_MESSAGE);
}

export function formatOfflinePrismaUserError(err: unknown): string | null {
  if (!(err instanceof Error)) return null;
  const msg = err.message;
  if (
    /reading 'findUnique'/.test(msg) ||
    /Cannot read properties of undefined/.test(msg)
  ) {
    return OFFLINE_PRISMA_SETUP_MESSAGE;
  }
  return null;
}