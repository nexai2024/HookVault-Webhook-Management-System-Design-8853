/**
 * API-key management.
 *   GET  /api/keys   - list the caller's keys (metadata only, never the raw key)
 *   POST /api/keys   - mint a new key; the raw value is returned exactly once
 *
 * Bootstrapping: the first key must be created out-of-band via the seed script
 * (npm run db:seed), since creating a key here itself requires a valid key.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate, generateApiKey } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' && body.name.trim()
    ? body.name.trim()
    : 'Untitled key';

  const { raw, hashedKey, prefix } = generateApiKey();
  const apiKey = await prisma.apiKey.create({
    data: { userId: auth.user.id, name, hashedKey, prefix },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });

  // `key` is returned only here and never persisted in plaintext.
  return NextResponse.json({ ...apiKey, key: raw }, { status: 201 });
}
