/**
 * Vault collection API.
 *   GET  /api/vaults        - list the authenticated user's vaults
 *   POST /api/vaults        - create a vault (generates an HMAC signing secret)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';
import { generateVaultSecret } from '@/lib/hmac';
import { logVaultActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const vaults = await prisma.vault.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { webhooks: true } } },
  });

  // Never expose the signing secret in list responses.
  const safe = vaults.map(({ secret, ...rest }) => rest);
  return NextResponse.json(safe);
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  const targetUrl = body?.targetUrl?.trim();

  if (!name || !targetUrl) {
    return NextResponse.json(
      { error: 'name and targetUrl are required' },
      { status: 400 },
    );
  }
  if (!/^https?:\/\//.test(targetUrl)) {
    return NextResponse.json(
      { error: 'targetUrl must start with http:// or https://' },
      { status: 400 },
    );
  }

  const vault = await prisma.vault.create({
    data: {
      userId: auth.user.id,
      name,
      targetUrl,
      secret: generateVaultSecret(),
    },
  });

  await logVaultActivity(vault.id, 'VAULT_CREATED', auth.user.email, { name });

  // Return the secret once, on creation only.
  return NextResponse.json(vault, { status: 201 });
}
