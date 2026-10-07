/**
 * HookVault API client.
 *
 * When VITE_HOOKVAULT_API_URL is configured, these functions talk to the real
 * backend (../backend-reference). Otherwise they fall back to in-memory MOCK
 * data so the dashboard remains fully demoable with no backend running.
 *
 * Responses are normalized to the shape the UI components already expect.
 */
import { formatDistanceToNow } from 'date-fns';
import { generateMockWebhooks } from '../mockData';

const API_URL = import.meta.env.VITE_HOOKVAULT_API_URL || '';
const API_KEY = import.meta.env.VITE_HOOKVAULT_API_KEY || '';

export const isApiConfigured = Boolean(API_URL);
export const apiBaseUrl = API_URL;

/**
 * URL for the SSE stream, including the API key as a query param (EventSource
 * cannot send an Authorization header). Returns null in mock mode.
 */
export function getStreamUrl() {
  if (!isApiConfigured) return null;
  const qs = API_KEY ? `?apiKey=${encodeURIComponent(API_KEY)}` : '';
  return `${API_URL}/api/webhooks/stream${qs}`;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ---------------------------------------------------------------------------
// Normalizers (backend shape -> UI shape)
// ---------------------------------------------------------------------------

function normalizeAttempt(a) {
  return {
    id: a.id || `att_${Math.random().toString(36).slice(2, 11)}`,
    attemptNumber: a.attemptNum ?? a.attemptNumber ?? 1,
    responseCode: a.responseCode,
    responseBody: a.responseBody,
    latencyMs: a.latencyMs,
    createdAt: a.createdAt,
  };
}

function normalizeWebhook(w) {
  if (!w) return w;
  return {
    ...w,
    attempts: Array.isArray(w.attempts) ? w.attempts.map(normalizeAttempt) : [],
  };
}

const VAULT_STATUS_LABEL = { ACTIVE: 'Active', PAUSED: 'Paused' };

function normalizeVault(v) {
  return {
    id: v.id,
    name: v.name,
    url: v.targetUrl ?? v.url,
    targetUrl: v.targetUrl ?? v.url,
    status: VAULT_STATUS_LABEL[v.status] ?? v.status,
    created: v.createdAt
      ? formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })
      : v.created ?? 'Just now',
    eventCount: v._count?.webhooks,
    secret: v.secret,
  };
}

function normalizeActivity(a) {
  const meta = a.metadata || {};
  return {
    id: a.id,
    action: a.action,
    actor: a.actorEmail ?? a.actor ?? 'System',
    time: new Date(a.createdAt ?? a.time ?? Date.now()),
    details: meta.details || prettifyAction(a.action, meta),
    changes:
      meta.from !== undefined && meta.to !== undefined
        ? { from: String(meta.from), to: String(meta.to) }
        : a.changes ?? null,
  };
}

function prettifyAction(action, meta) {
  switch (action) {
    case 'CONFIG_UPDATE':
      return `Updated ${meta.field || 'configuration'}`;
    case 'SECRET_ROTATED':
      return 'Rotated signing secret';
    case 'STATUS_CHANGED':
      return 'Changed vault status';
    case 'VAULT_CREATED':
      return 'Vault created';
    case 'VAULT_DELETED':
      return 'Vault deleted';
    case 'TRAFFIC_SPIKE':
      return meta.event === 'DLQ' ? 'Delivery moved to DLQ' : 'Traffic anomaly';
    default:
      return action;
  }
}

// ---------------------------------------------------------------------------
// MOCK layer (used when the API is not configured)
// ---------------------------------------------------------------------------

let mockWebhooks = null;
function mockStore() {
  if (!mockWebhooks) mockWebhooks = generateMockWebhooks(30);
  return mockWebhooks;
}

let mockVaults = [
  { id: 'vlt_stripe_live', name: 'Production Stripe', url: 'https://api.myapp.com/webhooks/stripe', targetUrl: 'https://api.myapp.com/webhooks/stripe', status: 'Active', created: '2 days ago' },
  { id: 'vlt_github_prod', name: 'GitHub Actions', url: 'https://ci.myapp.com/hooks/gh', targetUrl: 'https://ci.myapp.com/hooks/gh', status: 'Active', created: '5 days ago' },
  { id: 'vlt_shopify_sync', name: 'Shopify Sync', url: 'https://sync.myapp.com/shopify', targetUrl: 'https://sync.myapp.com/shopify', status: 'Paused', created: '1 month ago' },
];

const mockActivity = [
  { id: 'act_1', action: 'CONFIG_UPDATE', actorEmail: 'john@example.com', createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), metadata: { details: 'Updated target URL', from: 'https://old-api.com', to: 'https://new-api.com' } },
  { id: 'act_2', action: 'SECRET_ROTATED', actorEmail: 'john@example.com', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), metadata: {} },
  { id: 'act_3', action: 'TRAFFIC_SPIKE', actorEmail: 'System', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), metadata: { details: 'Abnormal traffic detected: 500 req/sec' } },
  { id: 'act_4', action: 'STATUS_CHANGED', actorEmail: 'sarah@example.com', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), metadata: { details: 'Vault resumed', from: 'PAUSED', to: 'ACTIVE' } },
];

let mockKeys = [
  { id: 'key_demo', name: 'Demo key', prefix: 'hv_demo123', lastUsedAt: new Date().toISOString(), revokedAt: null, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString() },
];

function filterMockWebhooks(filters = {}) {
  const { search, status, source, method } = filters;
  return mockStore().filter((h) => {
    if (search && !h.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (status && h.status !== status) return false;
    if (source && h.source !== source) return false;
    if (method && h.method !== method) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function listWebhooks(filters = {}) {
  if (!isApiConfigured) return filterMockWebhooks(filters);

  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.source) params.set('source', filters.source);
  if (filters.method) params.set('method', filters.method);
  if (filters.search) params.set('search', filters.search);
  if (filters.vaultId) params.set('vaultId', filters.vaultId);
  const qs = params.toString();
  const data = await request(`/api/webhooks${qs ? `?${qs}` : ''}`);
  // Client-side method filter (backend list doesn't filter by method).
  const rows = filters.method
    ? data.filter((w) => w.method === filters.method)
    : data;
  return rows.map(normalizeWebhook);
}

export async function getWebhook(id) {
  if (!id) return null;
  if (!isApiConfigured) {
    return normalizeWebhook(mockStore().find((h) => h.id === id) || null);
  }
  return normalizeWebhook(await request(`/api/webhooks/${id}`));
}

export async function replayWebhooks(ids) {
  const list = Array.isArray(ids) ? ids : [ids];
  if (!isApiConfigured) {
    for (const id of list) {
      const hook = mockStore().find((h) => h.id === id);
      if (hook) hook.status = Math.random() > 0.4 ? 'SUCCESS' : 'FAILED';
    }
    return { replayed: list.length };
  }
  return request('/api/dlq/replay', { method: 'POST', body: { webhookIds: list } });
}

export async function purgeDlq(vaultId) {
  if (!isApiConfigured) {
    const before = mockStore().length;
    mockWebhooks = mockStore().filter(
      (h) => h.status !== 'DLQ' && h.status !== 'FAILED',
    );
    return { purged: before - mockWebhooks.length };
  }
  return request('/api/dlq/purge', { method: 'POST', body: { vaultId } });
}

export async function listVaults() {
  if (!isApiConfigured) return mockVaults.map(normalizeVault);
  const data = await request('/api/vaults');
  return data.map(normalizeVault);
}

export async function createVault({ name, targetUrl }) {
  if (!isApiConfigured) {
    const vault = {
      id: `vlt_${Math.random().toString(36).slice(2, 9)}`,
      name,
      url: targetUrl,
      targetUrl,
      status: 'Active',
      created: 'Just now',
    };
    mockVaults = [vault, ...mockVaults];
    return normalizeVault(vault);
  }
  return normalizeVault(
    await request('/api/vaults', { method: 'POST', body: { name, targetUrl } }),
  );
}

export async function updateVault(id, patch) {
  if (!isApiConfigured) {
    mockVaults = mockVaults.map((v) => {
      if (v.id !== id) return v;
      const next = { ...v };
      if (patch.name !== undefined) next.name = patch.name;
      if (patch.targetUrl !== undefined) {
        next.targetUrl = patch.targetUrl;
        next.url = patch.targetUrl;
      }
      if (patch.status) next.status = patch.status === 'ACTIVE' ? 'Active' : 'Paused';
      if (patch.rotateSecret) next.secret = `whsec_${Math.random().toString(36).slice(2)}`;
      return next;
    });
    return normalizeVault(mockVaults.find((v) => v.id === id));
  }
  return normalizeVault(
    await request(`/api/vaults/${id}`, { method: 'PATCH', body: patch }),
  );
}

export async function deleteVault(id) {
  if (!isApiConfigured) {
    mockVaults = mockVaults.filter((v) => v.id !== id);
    return { deleted: true };
  }
  return request(`/api/vaults/${id}`, { method: 'DELETE' });
}

export async function getVaultActivity(vaultId) {
  if (!isApiConfigured) return mockActivity.map(normalizeActivity);
  const data = await request(`/api/vaults/${vaultId}/activity`);
  return data.map(normalizeActivity);
}

export async function getStats() {
  if (!isApiConfigured) {
    return {
      totalIngested: 1200000,
      successRate: 0.999,
      avgLatencyMs: 142,
      vaultCount: mockVaults.length,
      statusBreakdown: {},
      isMock: true,
    };
  }
  return request('/api/stats');
}

export async function listApiKeys() {
  if (!isApiConfigured) return mockKeys;
  return request('/api/keys');
}

export async function createApiKey(name) {
  if (!isApiConfigured) {
    const raw = `hv_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    const key = {
      id: `key_${Math.random().toString(36).slice(2, 9)}`,
      name: name || 'Untitled key',
      prefix: raw.slice(0, 11),
      createdAt: new Date().toISOString(),
      revokedAt: null,
      lastUsedAt: null,
    };
    mockKeys = [key, ...mockKeys];
    return { ...key, key: raw };
  }
  return request('/api/keys', { method: 'POST', body: { name } });
}
