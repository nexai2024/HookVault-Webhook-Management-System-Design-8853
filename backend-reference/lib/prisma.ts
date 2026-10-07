/**
 * Prisma Client Singleton for Next.js 14 App Router.
 * Prevents exhausting DB connections during Hot Module Replacement (HMR)
 * by reusing a single client across reloads in development.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
