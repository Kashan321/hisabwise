import Redis from 'ioredis';
import { env } from '../../config/env';

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
  }

  return redisConnection;
}

export async function connectRedis(): Promise<boolean> {
  const redis = getRedisConnection();

  if (redis.status === 'ready') {
    return true;
  }

  try {
    await redis.connect();
    return true;
  } catch {
    return false;
  }
}
