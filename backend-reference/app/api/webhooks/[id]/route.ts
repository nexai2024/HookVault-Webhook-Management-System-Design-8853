/**
 * Single webhook entry API (powers the detail drawer).
 *   GET /api/webhooks/[id]  - full payload, headers, and delivery attempts
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await authenticate(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entry = await prisma.webhookEntry.findUnique({
    where: { id: params.id },
    include: {
      vault: { select: { userId: true, targetUrl: true, name: true } },
      attempts: { orderBy: { attemptNum: 'asc' } },
    },
  });

  if (!entry || entry.vault.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  return NextResponse.json(entry);
}
