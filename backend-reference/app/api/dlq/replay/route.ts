/**
 * DLQ Replay Worker Trigger
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { webhookQueue } from '@/lib/queue';

export async function POST(req: NextRequest) {
  const { webhookIds } = await req.json(); // Array of IDs or single ID

  const ids = Array.isArray(webhookIds) ? webhookIds : [webhookIds];

  const webhooks = await prisma.webhookEntry.findMany({
    where: { id: { in: ids } }
  });

  for (const hook of webhooks) {
    // 1. Reset status in DB
    await prisma.webhookEntry.update({
      where: { id: hook.id },
      data: { status: 'PENDING' }
    });

    // 2. Add back to queue with high priority
    await webhookQueue.add('deliver-webhook', {
      entryId: hook.id,
      vaultId: hook.vaultId,
      payload: hook.payload,
      headers: hook.headers
    }, { priority: 1 });
  }

  return NextResponse.json({ replayed: ids.length });
}