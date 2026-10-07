/**
 * Aggregate stats for the Storage & Performance dashboard.
 *   GET /api/stats
 */
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const where: Prisma.WebhookEntryWhereInput = {
    vault: { userId: auth.user.id },
  };

  const [breakdown, latency, vaultCount] = await Promise.all([
    prisma.webhookEntry.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
    prisma.deliveryAttempt.aggregate({
      _avg: { latencyMs: true },
      where: { webhook: { vault: { userId: auth.user.id } } },
    }),
    prisma.vault.count({ where: { userId: auth.user.id } }),
  ]);

  const statusBreakdown: Record<string, number> = {};
  let total = 0;
  for (const row of breakdown) {
    statusBreakdown[row.status] = row._count._all;
    total += row._count._all;
  }

  const success = statusBreakdown.SUCCESS ?? 0;
  const successRate = total > 0 ? success / total : 0;

  return NextResponse.json({
    totalIngested: total,
    successRate,
    avgLatencyMs: Math.round(latency._avg.latencyMs ?? 0),
    vaultCount,
    statusBreakdown,
  });
}
