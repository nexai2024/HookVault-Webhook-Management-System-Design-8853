/**
 * API-key authentication for the HookVault management API.
 *
 * Keys look like `hv_<48 hex chars>`. Only a SHA-256 hash is stored; the raw
 * value is returned to the caller once, at creation time. Requests authenticate
 * via the `Authorization: Bearer hv_...` header.
 */
import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import type { ApiKey, User } from '@prisma/client';
import { prisma } from './prisma';

const KEY_PREFIX = 'hv_';
const PREFIX_DISPLAY_LEN = 11; // "hv_" + first 8 hex chars

export interface GeneratedApiKey {
  raw: string;
  hashedKey: string;
  prefix: string;
}

export function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

/** Create a new random API key. Persist `hashedKey`/`prefix`; show `raw` once. */
export function generateApiKey(): GeneratedApiKey {
  const raw = KEY_PREFIX + crypto.randomBytes(24).toString('hex');
  return {
    raw,
    hashedKey: hashKey(raw),
    prefix: raw.slice(0, PREFIX_DISPLAY_LEN),
  };
}

export interface AuthContext {
  user: User;
  apiKey: ApiKey;
}

/**
 * Resolve the authenticated user from a raw API key string.
 * Returns null when the key is malformed, revoked, or unknown.
 */
export async function authenticateRawKey(
  raw: string | null | undefined,
): Promise<AuthContext | null> {
  if (!raw || !raw.startsWith(KEY_PREFIX)) return null;

  const apiKey = await prisma.apiKey.findUnique({
    where: { hashedKey: hashKey(raw) },
    include: { user: true },
  });

  if (!apiKey || apiKey.revokedAt) return null;

  // Best-effort last-used tracking (don't block the request on it).
  await prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return { user: apiKey.user, apiKey };
}

/**
 * Resolve the authenticated user from a request's bearer token.
 * Returns null when the header is missing, malformed, revoked, or unknown.
 */
export async function authenticate(
  req: NextRequest,
): Promise<AuthContext | null> {
  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  return authenticateRawKey(header.slice('Bearer '.length).trim());
}

/**
 * Like `authenticate`, but also accepts the key via an `apiKey` query param.
 * Needed for the SSE stream, since the browser's EventSource cannot set headers.
 */
export async function authenticateRequestOrToken(
  req: NextRequest,
): Promise<AuthContext | null> {
  const header = req.headers.get('authorization');
  if (header?.startsWith('Bearer ')) {
    return authenticateRawKey(header.slice('Bearer '.length).trim());
  }
  const token = req.nextUrl.searchParams.get('apiKey');
  return authenticateRawKey(token?.trim());
}
