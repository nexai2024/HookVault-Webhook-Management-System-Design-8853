/**
 * Real-time event fan-out over Redis pub/sub.
 *
 * Ingestion, the delivery worker, and replay all publish lightweight events to
 * a single channel. The SSE endpoint (app/api/webhooks/stream) subscribes with
 * a dedicated connection and forwards events to the browser, filtered by the
 * authenticated user.
 */
import { Redis } from 'ioredis';

export const EVENTS_CHANNEL = 'hookvault:events';

export type WebhookEventType = 'received' | 'status' | 'replayed';

export interface WebhookEvent {
  userId: string;
  type: WebhookEventType;
  entry: {
    id: string;
    vaultId: string;
    status: string;
    source?: string;
    method?: string;
    createdAt?: string;
  };
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Dedicated publisher connection, reused across HMR in development.
const globalForPub = global as unknown as { hookvaultPublisher: Redis };
export const publisher =
  globalForPub.hookvaultPublisher ||
  new Redis(redisUrl, { maxRetriesPerRequest: null });

if (process.env.NODE_ENV !== 'production') {
  globalForPub.hookvaultPublisher = publisher;
}

export async function publishWebhookEvent(event: WebhookEvent): Promise<void> {
  try {
    await publisher.publish(EVENTS_CHANNEL, JSON.stringify(event));
  } catch (err) {
    // Never let a telemetry failure break the main request/job.
    console.error('Failed to publish webhook event:', err);
  }
}

/** Create a fresh connection for subscribe mode (one per SSE client). */
export function createSubscriber(): Redis {
  return new Redis(redisUrl, { maxRetriesPerRequest: null });
}
