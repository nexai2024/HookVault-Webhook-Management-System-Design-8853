/**
 * Redis Singleton for Next.js 14 App Router
 * Prevents connection leaks during Hot Module Replacement (HMR)
 */
import { Redis } from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required by BullMQ
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;