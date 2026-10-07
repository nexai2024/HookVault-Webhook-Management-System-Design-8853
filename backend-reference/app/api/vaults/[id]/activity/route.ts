/**
 * Vault audit-log API.
 *   GET /api/vaults/[id]/activity - recent activity for a vault owned by caller
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

  // Ownership check.
  const vault = await prisma.vault.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });
  if (!vault || vault.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
  }

  const activity = await prisma.vaultActivity.findMany({
    where: { vaultId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(activity);
}
