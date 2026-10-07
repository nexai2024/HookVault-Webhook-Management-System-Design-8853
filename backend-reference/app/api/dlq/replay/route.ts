/**
 * DLQ replay trigger.
 *   POST /api/dlq/replay   body: { webhookIds: string | string[] }
 *
 * Resets the given entries to PENDING and re-enqueues them with high priority.
 * Only entries belonging to the caller's vaults are eligible.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { webhookQueue } from '@/lib/queue';
import { authenticate } from '@/lib/auth';
import { publishWebhookEvent } from '@/lib/events';

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const raw = body?.webhookIds;
  if (!raw) {
    return NextResponse.json(
      { error: 'webhookIds is required' },
      { status: 400 },
    );
  }
  const ids: string[] = Array.isArray(raw) ? raw : [raw];

  // Only replay entries the caller actually owns.
  const webhooks = await prisma.webhookEntry.findMany({
    where: {
      id: { in: ids },
      vault: { userId: auth.user.id },
    },
    select: { id: true, vaultId: true },
  });

  for (const hook of webhooks) {
    await prisma.webhookEntry.update({
      where: { id: hook.id },
      data: { status: 'PENDING' },
    });
    await webhookQueue.add(
      'deliver-webhook',
      { entryId: hook.id, vaultId: hook.vaultId },
      { priority: 1 },
    );
    await publishWebhookEvent({
      userId: auth.user.id,
      type: 'replayed',
      entry: { id: hook.id, vaultId: hook.vaultId, status: 'PENDING' },
    });
  }

  return NextResponse.json({ replayed: webhooks.length });
}
