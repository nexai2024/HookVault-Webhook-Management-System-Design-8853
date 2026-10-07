/**
 * Public ingestion endpoint.
 * Path: POST /api/v1/ingest/[vaultId]
 *
 * This is the URL external providers (Stripe, GitHub, ...) call. It must:
 *   1. Accept the payload quickly and durably persist it.
 *   2. Deduplicate via an idempotency key.
 *   3. Offload actual delivery to the background worker.
 *   4. Respond with 202 in well under 200ms.
 *
 * It is intentionally NOT behind API-key auth - it is called by third parties.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { webhookQueue } from '@/lib/queue';
import { publishWebhookEvent } from '@/lib/events';

const KNOWN_SOURCES = ['stripe', 'github', 'shopify', 'slack', 'twilio'];

/** Best-effort source detection from query param, header, or user-agent. */
function detectSource(
  req: NextRequest,
  headers: Record<string, string>,
): string {
  const fromQuery = req.nextUrl.searchParams.get('source');
  if (fromQuery) return fromQuery.toLowerCase();

  const fromHeader = headers['x-hookvault-source'];
  if (fromHeader) return fromHeader.toLowerCase();

  const ua = (headers['user-agent'] || '').toLowerCase();
  const match = KNOWN_SOURCES.find((s) => ua.includes(s));
  return match ?? 'custom';
}

export async function POST(
  req: NextRequest,
  { params }: { params: { vaultId: string } },
) {
  try {
    const { vaultId } = params;

    // 1. Validate the vault exists and is accepting traffic.
    const vault = await prisma.vault.findUnique({ where: { id: vaultId } });
    if (!vault) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }
    if (vault.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Vault is paused' },
        { status: 403 },
      );
    }

    // 2. Extract headers + body.
    const headers = Object.fromEntries(req.headers.entries());
    const rawBody = await req.text();
    let payload: unknown;
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      payload = { raw: rawBody };
    }

    // 3. Idempotency: dedupe repeated deliveries of the same event.
    const idempotencyKey = headers['x-hookvault-id'] || crypto.randomUUID();
    const source = detectSource(req, headers);

    const existing = await prisma.webhookEntry.findUnique({
      where: { idempotency: idempotencyKey },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { status: 'ignored', reason: 'duplicate', id: existing.id },
        { status: 200 },
      );
    }

    // 4. Durable insert (kept in the request path so the UI can track it).
    const entry = await prisma.webhookEntry.create({
      data: {
        vaultId,
        idempotency: idempotencyKey,
        source,
        method: req.method,
        payload: payload as Prisma.InputJsonValue,
        headers: headers as Prisma.InputJsonValue,
        status: 'PENDING',
      },
    });

    // 5. Offload delivery to the worker.
    await webhookQueue.add('deliver-webhook', {
      entryId: entry.id,
      vaultId,
    });

    // 5b. Notify real-time subscribers.
    await publishWebhookEvent({
      userId: vault.userId,
      type: 'received',
      entry: {
        id: entry.id,
        vaultId,
        status: entry.status,
        source: entry.source,
        method: entry.method,
        createdAt: entry.createdAt.toISOString(),
      },
    });

    // 6. Fast ack.
    return NextResponse.json(
      { status: 'accepted', id: entry.id },
      { status: 202 },
    );
  } catch (error) {
    console.error('Ingestion Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
