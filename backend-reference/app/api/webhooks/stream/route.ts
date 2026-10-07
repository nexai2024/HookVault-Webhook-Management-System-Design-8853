/**
 * Server-Sent Events stream of real-time webhook activity.
 *   GET /api/webhooks/stream?apiKey=hv_...
 *
 * Subscribes to the Redis events channel and forwards events for the
 * authenticated user's vaults. Auth is via query param because the browser's
 * EventSource API cannot attach an Authorization header.
 */
import type { NextRequest } from 'next/server';
import { authenticateRequestOrToken } from '@/lib/auth';
import { EVENTS_CHANNEL, createSubscriber, type WebhookEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await authenticateRequestOrToken(req);
  if (!auth) {
    return new Response('Unauthorized', { status: 401 });
  }
  const userId = auth.user.id;

  const subscriber = createSubscriber();
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      // Initial handshake so the client flips to "live" immediately.
      send('event: ready\ndata: {"ok":true}\n\n');

      subscriber.on('message', (_channel: string, message: string) => {
        try {
          const event = JSON.parse(message) as WebhookEvent;
          if (event.userId !== userId) return; // tenant isolation
          send(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
        } catch {
          /* ignore malformed messages */
        }
      });

      await subscriber.subscribe(EVENTS_CHANNEL);

      // Comment heartbeats keep proxies from closing an idle connection.
      heartbeat = setInterval(() => send(': ping\n\n'), 25000);
    },
    async cancel() {
      if (heartbeat) clearInterval(heartbeat);
      await subscriber.unsubscribe(EVENTS_CHANNEL).catch(() => undefined);
      subscriber.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable proxy buffering (e.g. nginx) so events flush immediately.
      'X-Accel-Buffering': 'no',
    },
  });
}
