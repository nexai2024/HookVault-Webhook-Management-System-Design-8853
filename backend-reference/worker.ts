/**
 * Standalone BullMQ worker that performs outbound webhook delivery.
 * Run as a separate process:  npm run worker
 *
 * Flow per job:
 *   1. Load the WebhookEntry + its Vault.
 *   2. Sign the payload with the vault's HMAC secret.
 *   3. POST to the vault's target URL.
 *   4. Record a DeliveryAttempt and update status.
 * Retries (with exponential backoff) and the DLQ transition are driven by the
 * queue config in lib/queue.ts and the `failed` handler below.
 */
import { Worker, Job, UnrecoverableError } from 'bullmq';
import { redis } from './lib/redis';
import { prisma } from './lib/prisma';
import { signPayload, SIGNATURE_HEADER } from './lib/hmac';
import { logVaultActivity } from './lib/activity';
import { publishWebhookEvent } from './lib/events';

interface DeliveryJobData {
  entryId: string;
  vaultId: string;
}

// Mock alert hook - wire to Slack/email/PagerDuty in production.
const sendAlert = async (entryId: string, vaultId: string): Promise<void> => {
  console.error(
    `[ALERT] Webhook ${entryId} for vault ${vaultId} moved to DLQ after exhausting retries.`,
  );
};

const worker = new Worker<DeliveryJobData>(
  'webhooks',
  async (job: Job<DeliveryJobData>) => {
    const { entryId } = job.data;

    // 1. Load the entry + vault (source of truth lives in the DB, not the job).
    const entry = await prisma.webhookEntry.findUnique({
      where: { id: entryId },
      include: { vault: true },
    });
    if (!entry) {
      // Nothing to deliver; don't retry a vanished record.
      throw new UnrecoverableError(`WebhookEntry ${entryId} not found`);
    }
    if (!entry.vault) {
      throw new UnrecoverableError(`Vault ${entry.vaultId} not found`);
    }

    const attemptNum = job.attemptsMade + 1;
    const rawBody = JSON.stringify(entry.payload);
    const { header: signature } = signPayload(entry.vault.secret, rawBody);

    const startTime = Date.now();
    let responseCode: number | null = null;
    let responseBody = '';

    try {
      const response = await fetch(entry.vault.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-HookVault-Delivery': 'true',
          'X-HookVault-Id': entry.idempotency,
          'X-HookVault-Attempt': String(attemptNum),
          [SIGNATURE_HEADER]: signature,
        },
        body: rawBody,
      });

      responseCode = response.status;
      responseBody = await response
        .text()
        .catch(() => 'Unreadable response body');
      const latencyMs = Date.now() - startTime;

      await prisma.deliveryAttempt.create({
        data: {
          webhookId: entry.id,
          attemptNum,
          responseCode,
          responseBody: responseBody.slice(0, 1000),
          latencyMs,
        },
      });

      if (!response.ok) {
        throw new Error(`Target returned status ${responseCode}`);
      }

      // Success.
      await prisma.webhookEntry.update({
        where: { id: entry.id },
        data: { status: 'SUCCESS' },
      });
      await publishWebhookEvent({
        userId: entry.vault.userId,
        type: 'status',
        entry: { id: entry.id, vaultId: entry.vaultId, status: 'SUCCESS' },
      });
    } catch (error) {
      // Network-level failure (no HTTP response): log a synthetic attempt.
      if (responseCode === null) {
        const latencyMs = Date.now() - startTime;
        await prisma.deliveryAttempt.create({
          data: {
            webhookId: entry.id,
            attemptNum,
            responseCode: 0,
            responseBody:
              error instanceof Error ? error.message : 'Unknown error',
            latencyMs,
          },
        });
      }
      // Re-throw so BullMQ schedules a retry (or fires `failed` if exhausted).
      throw error;
    }
  },
  { connection: redis, concurrency: 10 },
);

// Transition status on each failure: RETRYING while attempts remain, DLQ once
// exhausted.
worker.on('failed', async (job, err) => {
  if (!job) return;
  const { entryId, vaultId } = job.data;
  const maxAttempts = job.opts.attempts ?? 1;

  try {
    const owner = await prisma.vault.findUnique({
      where: { id: vaultId },
      select: { userId: true },
    });

    if (job.attemptsMade >= maxAttempts) {
      await prisma.webhookEntry.update({
        where: { id: entryId },
        data: { status: 'DLQ' },
      });
      await logVaultActivity(vaultId, 'TRAFFIC_SPIKE', 'System', {
        event: 'DLQ',
        entryId,
        error: err?.message,
      }).catch(() => undefined);
      await sendAlert(entryId, vaultId);
      if (owner) {
        await publishWebhookEvent({
          userId: owner.userId,
          type: 'status',
          entry: { id: entryId, vaultId, status: 'DLQ' },
        });
      }
    } else {
      await prisma.webhookEntry.update({
        where: { id: entryId },
        data: { status: 'RETRYING' },
      });
      if (owner) {
        await publishWebhookEvent({
          userId: owner.userId,
          type: 'status',
          entry: { id: entryId, vaultId, status: 'RETRYING' },
        });
      }
    }
  } catch (e) {
    console.error('Failed to update entry status after job failure:', e);
  }
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('HookVault worker started, listening on queue: webhooks');
