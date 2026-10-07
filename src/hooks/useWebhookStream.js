import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getStreamUrl } from '../lib/api';

/**
 * Opens an SSE connection to the backend and invalidates the relevant React
 * Query caches whenever a real-time webhook event arrives. Falls back silently
 * in mock mode (no stream URL), where polling handles freshness.
 *
 * Returns { connected } so the UI can show a truthful "live" indicator.
 */
export function useWebhookStream() {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);

  useEffect(() => {
    const url = getStreamUrl();
    if (!url) return undefined; // mock mode

    const es = new EventSource(url);
    esRef.current = es;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    };

    es.addEventListener('ready', () => setConnected(true));
    es.addEventListener('received', invalidate);
    es.addEventListener('status', invalidate);
    es.addEventListener('replayed', invalidate);
    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [queryClient]);

  return { connected };
}
