/**
 * HMAC signing + verification for webhook payloads.
 *
 * Outbound deliveries are signed with the vault's `secret` so that the
 * customer's endpoint can verify the request genuinely came from HookVault.
 * The scheme is Stripe-style: we sign `${timestamp}.${rawBody}` and send a
 * header of the form `t=<unix>,v1=<hex-hmac-sha256>`.
 */
import crypto from 'crypto';

export const SIGNATURE_HEADER = 'x-hookvault-signature';

export interface SignatureParts {
  timestamp: number;
  header: string;
}

/** Produce the signature header value for an outbound delivery. */
export function signPayload(
  secret: string,
  rawBody: string,
  timestamp: number = Math.floor(Date.now() / 1000),
): SignatureParts {
  const signedContent = `${timestamp}.${rawBody}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedContent, 'utf8')
    .digest('hex');
  return { timestamp, header: `t=${timestamp},v1=${signature}` };
}

/**
 * Verify an incoming signature header against the raw body.
 * Returns true only if a valid v1 signature is present and within tolerance.
 */
export function verifySignature(
  secret: string,
  rawBody: string,
  headerValue: string | null | undefined,
  toleranceSeconds = 300,
): boolean {
  if (!headerValue) return false;

  const parts = Object.fromEntries(
    headerValue.split(',').map((kv) => {
      const idx = kv.indexOf('=');
      return [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()];
    }),
  );

  const timestamp = Number(parts.t);
  const provided = parts.v1;
  if (!timestamp || !provided) return false;

  // Reject stale timestamps to mitigate replay attacks.
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex');

  // Length check guards timingSafeEqual (which throws on length mismatch).
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'utf8'),
    Buffer.from(provided, 'utf8'),
  );
}

/** Generate a fresh random vault signing secret. */
export function generateVaultSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}
