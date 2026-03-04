/**
 * Next.js 14 App Router - Edge Ingestion Handler
 * Path: app/api/v1/ingest/[vaultId]/route.ts
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { webhookQueue } from '@/lib/queue';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: { vaultId: string } }
) {
  try {
    const vaultId = params.vaultId;
    
    // 1. Extract Headers & Payload
    const headers = Object.fromEntries(req.headers.entries());
    const rawBody = await req.text();
    let payload = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = { raw: rawBody };
    }

    // 2. Idempotency Check (Prevent duplicate ingestion)
    const idempotencyKey = headers['x-hookvault-id'] || crypto.randomUUID();

    // 3. Fast DB Insert (Ideally, this could also be offloaded, but needed for UI tracking)
    // Using upsert to handle idempotency safely
    const entry = await prisma.webhookEntry.upsert({
      where: { idempotency: idempotencyKey },
      update: {}, // Do nothing if it exists
      create: {
        vaultId: vaultId,
        idempotency: idempotencyKey,
        payload: payload,
        headers: headers,
        status: 'PENDING'
      }
    });

    // If it already existed and wasn't just created, return early (Duplicate)
    if (entry.createdAt < new Date(Date.now() - 1000)) {
      return NextResponse.json({ status: 'ignored', reason: 'duplicate' }, { status: 200 });
    }

    // 4. Offload to Background Worker via BullMQ
    // We pass the DB entry ID so the worker can update its status
    await webhookQueue.add('deliver-webhook', {
      entryId: entry.id,
      vaultId: vaultId,
      payload: payload,
      headers: headers
    });

    // 5. Return <200ms Response
    return NextResponse.json({ 
      status: 'accepted', 
      id: entry.id 
    }, { status: 202 });

  } catch (error) {
    console.error('Ingestion Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}