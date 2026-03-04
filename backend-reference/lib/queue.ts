/**
 * BullMQ Queue Singleton
 */
import { Queue } from 'bullmq';
import { redis } from './redis';

const globalForQueue = global as unknown as { webhookQueue: Queue };

export const webhookQueue =
  globalForQueue.webhookQueue ||
  new Queue('webhooks', {
    connection: redis,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000, // 1s, 2s, 4s, 8s, 16s
      },
      removeOnComplete: true,
      removeOnFail: false, // Keep failed jobs in queue for inspection
    },
  });

if (process.env.NODE_ENV !== 'production') globalForQueue.webhookQueue = webhookQueue;