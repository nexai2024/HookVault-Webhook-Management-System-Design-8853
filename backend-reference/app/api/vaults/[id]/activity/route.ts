/**
 * Vault Activity / Audit Log API
 * Path: app/api/vaults/[id]/activity/route.ts
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const activity = await prisma.$queryRaw`
      SELECT * FROM vault_activity_20240521 
      WHERE vault_id = ${params.id} 
      ORDER BY created_at DESC 
      LIMIT 50
    `;
    
    return NextResponse.json(activity);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}

// Utility function to log activity (Internal use)
export async function logVaultActivity(
  vaultId: string, 
  action: string, 
  actorEmail: string, 
  metadata: any
) {
  await prisma.$executeRaw`
    INSERT INTO vault_activity_20240521 (vault_id, action, actor_email, metadata)
    VALUES (${vaultId}, ${action}, ${actorEmail}, ${metadata})
  `;
}