/**
 * Purge the Dead Letter Queue.
 *   POST /api/dlq/purge   body (optional): { vaultId?: string }
 *
 * Deletes the caller's DLQ + FAILED entries (optionally scoped to one vault).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const vaultId: string | undefined =
    typeof body?.vaultId === 'string' ? body.vaultId : undefined;

  const result = await prisma.webhookEntry.deleteMany({
    where: {
      status: { in: ['DLQ', 'FAILED'] },
      vault: { userId: auth.user.id },
      ...(vaultId ? { vaultId } : {}),
    },
  });

  return NextResponse.json({ purged: result.count });
}
