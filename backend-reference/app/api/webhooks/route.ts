/**
 * Webhook entry list API (powers the live feed + DLQ).
 *   GET /api/webhooks?status=&source=&vaultId=&search=&limit=
 *
 * `status` may be a comma-separated list (e.g. "DLQ,FAILED").
 * Returns lightweight rows (no full payload/headers) plus the latest attempt
 * so the UI can show the most recent response code without a second request.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, DeliveryStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

const VALID_STATUSES: DeliveryStatus[] = [
  'PENDING',
  'RETRYING',
  'SUCCESS',
  'FAILED',
  'DLQ',
];

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const statusParam = searchParams.get('status');
  const source = searchParams.get('source');
  const vaultId = searchParams.get('vaultId');
  const search = searchParams.get('search');
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

  const where: Prisma.WebhookEntryWhereInput = {
    vault: { userId: auth.user.id },
  };

  if (statusParam) {
    const statuses = statusParam
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s): s is DeliveryStatus =>
        VALID_STATUSES.includes(s as DeliveryStatus),
      );
    if (statuses.length === 1) where.status = statuses[0];
    else if (statuses.length > 1) where.status = { in: statuses };
  }
  if (source) where.source = source;
  if (vaultId) where.vaultId = vaultId;
  if (search) where.id = { contains: search, mode: 'insensitive' };

  const entries = await prisma.webhookEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      vaultId: true,
      source: true,
      method: true,
      status: true,
      createdAt: true,
      attempts: {
        orderBy: { attemptNum: 'desc' },
        take: 1,
        select: {
          attemptNum: true,
          responseCode: true,
          responseBody: true,
          latencyMs: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json(entries);
}
