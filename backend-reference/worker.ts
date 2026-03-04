/**
 * Standalone BullMQ Worker Logic
 * Run this as a separate Node process: `node worker.js`
 */
import { Worker, Job } from 'bullmq';
import { redis } from './lib/redis';
import { prisma } from './lib/prisma';

// Mock Alert Function
const sendAlert = async (entryId: string, vaultId: string) => {
  console.error(`[ALERT] Webhook ${entryId} for vault ${vaultId} moved to DLQ after 5 retries.`);
  // Implement Slack/Email notification here
};

const worker = new Worker('webhooks', async (job: Job) => {
  const { entryId, vaultId, payload, headers } = job.data;

  // 1. Fetch Vault configuration to get target URL
  const vault = await prisma.vault.findUnique({ where: { id: vaultId } });
  if (!vault) throw new Error(`Vault ${vaultId} not found`);

  const startTime = Date.now();
  let responseCode = null;
  let responseBody = null;

  try {
    // 2. Attempt Delivery
    const response = await fetch(vault.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HookVault-Delivery': 'true',
        // Forward safe headers if needed
      },
      body: JSON.stringify(payload)
    });

    responseCode = response.status;
    responseBody = await response.text().catch(() => 'Unreadable response body');
    const latencyMs = Date.now() - startTime;

    // 3. Log Attempt
    await prisma.deliveryAttempt.create({
      data: {
        webhookId: entryId,
        attemptNum: job.attemptsMade + 1,
        responseCode,
        responseBody: responseBody.substring(0, 1000), // truncate
        latencyMs
      }
    });

    if (!response.ok) {
      throw new Error(`Target returned status ${responseCode}`);
    }

    // 4. Mark Success
    await prisma.webhookEntry.update({
      where: { id: entryId },
      data: { status: 'SUCCESS' }
    });

  } catch (error: any) {
    // If fetch failed completely (e.g. network error)
    if (!responseCode) {
      const latencyMs = Date.now() - startTime;
      await prisma.deliveryAttempt.create({
        data: {
          webhookId: entryId,
          attemptNum: job.attemptsMade + 1,
          responseCode: 0,
          responseBody: error.message,
          latencyMs
        }
      });
    }
    
    // Re-throw to trigger BullMQ retry
    throw error;
  }
}, { connection: redis });

// Handle Job Failure (Moves to DLQ after max retries)
worker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= job.opts.attempts!) {
    const { entryId, vaultId } = job.data;
    
    // Update DB status to DLQ
    await prisma.webhookEntry.update({
      where: { id: entryId },
      data: { status: 'DLQ' }
    });

    // Trigger Alert
    await sendAlert(entryId, vaultId);
  }
});

console.log('HookVault Worker started listening on queue: webhooks');