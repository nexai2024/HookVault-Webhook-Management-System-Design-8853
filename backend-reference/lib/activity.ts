/**
 * Vault audit-log helper. Writes to the VaultActivity table via Prisma
 * (replaces the previous raw-SQL inserts against the Supabase table).
 */
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type VaultAction =
  | 'CONFIG_UPDATE'
  | 'SECRET_ROTATED'
  | 'STATUS_CHANGED'
  | 'TRAFFIC_SPIKE'
  | 'VAULT_CREATED'
  | 'VAULT_DELETED';

export async function logVaultActivity(
  vaultId: string,
  action: VaultAction,
  actorEmail: string,
  metadata: Prisma.InputJsonValue = {},
): Promise<void> {
  await prisma.vaultActivity.create({
    data: { vaultId, action, actorEmail, metadata },
  });
}
