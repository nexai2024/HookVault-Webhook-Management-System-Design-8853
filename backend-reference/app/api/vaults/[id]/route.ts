/**
 * Single-vault API.
 *   GET    /api/vaults/[id]           - fetch one vault (owned by caller)
 *   PATCH  /api/vaults/[id]           - update name/targetUrl/status, or rotate secret
 *   DELETE /api/vaults/[id]           - delete a vault (cascades webhooks/attempts)
 *
 * PATCH body:
 *   { name?, targetUrl?, status?: "ACTIVE"|"PAUSED", rotateSecret?: true }
 */
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, VaultStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { authenticate } from '@/lib/auth';
import { generateVaultSecret } from '@/lib/hmac';
import { logVaultActivity } from '@/lib/activity';

/** Load the vault only if it belongs to the authenticated user. */
async function getOwnedVault(req: NextRequest, id: string) {
  const auth = await authenticate(req);
  if (!auth) return { error: 'Unauthorized', status: 401 as const };

  const vault = await prisma.vault.findUnique({ where: { id } });
  if (!vault || vault.userId !== auth.user.id) {
    return { error: 'Vault not found', status: 404 as const };
  }
  return { auth, vault };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const result = await getOwnedVault(req, params.id);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { secret, ...safe } = result.vault;
  return NextResponse.json(safe);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const result = await getOwnedVault(req, params.id);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { auth, vault } = result;

  const body = await req.json().catch(() => ({}));
  const data: Prisma.VaultUpdateInput = {};

  if (typeof body.name === 'string' && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.targetUrl === 'string') {
    if (!/^https?:\/\//.test(body.targetUrl)) {
      return NextResponse.json(
        { error: 'targetUrl must start with http:// or https://' },
        { status: 400 },
      );
    }
    data.targetUrl = body.targetUrl.trim();
  }
  if (body.status === 'ACTIVE' || body.status === 'PAUSED') {
    data.status = body.status as VaultStatus;
  }
  if (body.rotateSecret === true) {
    data.secret = generateVaultSecret();
  }

  const updated = await prisma.vault.update({
    where: { id: vault.id },
    data,
  });

  // Audit each meaningful change.
  if (body.rotateSecret === true) {
    await logVaultActivity(vault.id, 'SECRET_ROTATED', auth.user.email, {});
  }
  if (data.status && data.status !== vault.status) {
    await logVaultActivity(vault.id, 'STATUS_CHANGED', auth.user.email, {
      from: vault.status,
      to: data.status,
    });
  }
  if (data.targetUrl && data.targetUrl !== vault.targetUrl) {
    await logVaultActivity(vault.id, 'CONFIG_UPDATE', auth.user.email, {
      field: 'targetUrl',
      from: vault.targetUrl,
      to: data.targetUrl,
    });
  }

  // Expose the new secret only when it was just rotated.
  if (body.rotateSecret === true) {
    return NextResponse.json(updated);
  }
  const { secret, ...safe } = updated;
  return NextResponse.json(safe);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const result = await getOwnedVault(req, params.id);
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await prisma.vault.delete({ where: { id: result.vault.id } });
  return NextResponse.json({ deleted: true });
}
