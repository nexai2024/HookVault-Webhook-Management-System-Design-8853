/**
 * Vault Management API
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const vaults = await prisma.vault.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { webhooks: true } } }
  });
  return NextResponse.json(vaults);
}

export async function POST(req: NextRequest) {
  const { name, targetUrl } = await req.json();
  const vault = await prisma.vault.create({
    data: {
      name,
      targetUrl,
      secret: require('crypto').randomBytes(32).toString('hex')
    }
  });
  return NextResponse.json(vault);
}