# HookVault Backend (Prisma + Postgres)

The real ingestion & delivery backend for HookVault. Next.js 14 App Router API
routes + a standalone BullMQ worker, backed by PostgreSQL (Prisma) and Redis.

> This is the single source of truth for the data model. The frontend (`../`)
> consumes these APIs; the old Supabase migrations have been retired in favor of
> the Prisma schema here.

## Architecture

```
External provider ──POST──▶ /api/v1/ingest/[vaultId]
                              │  (validate vault, dedupe, persist PENDING)
                              ▼
                         Postgres (WebhookEntry)
                              │
                              ▼  enqueue { entryId, vaultId }
                         Redis (BullMQ "webhooks")
                              │
                              ▼  worker.ts
                 sign (HMAC) ─▶ POST target URL ─▶ log DeliveryAttempt
                              │
             success ─▶ SUCCESS   retry ─▶ RETRYING   exhausted ─▶ DLQ + alert
```

## Prerequisites

- Node 18+
- PostgreSQL (local or hosted)
- Redis (required by BullMQ)

## Setup

```bash
cd backend-reference
npm install
cp .env.example .env            # edit DATABASE_URL / REDIS_URL

npm run prisma:generate
npm run prisma:migrate          # creates tables
npm run db:seed                 # prints a demo API key + starter vault
```

## Run

Two processes:

```bash
npm run dev        # API on http://localhost:4000
npm run worker     # delivery worker (separate terminal)
```

## Authentication

Management endpoints require an API key (minted by the seed script or
`POST /api/keys`). The **ingestion** endpoint is public (called by third parties).

```
Authorization: Bearer hv_xxxxxxxxxxxxxxxxxxxxxxxx
```

Keys are stored only as SHA-256 hashes; the raw value is shown once at creation.

## Endpoints

| Method | Path                           | Auth | Purpose                                  |
| ------ | ------------------------------ | ---- | ---------------------------------------- |
| POST   | `/api/v1/ingest/[vaultId]`     | none | Ingest a webhook (dedupe + enqueue)      |
| GET    | `/api/webhooks`                | key  | List entries (status/source/search)      |
| GET    | `/api/webhooks/[id]`           | key  | One entry with payload + attempts        |
| GET    | `/api/webhooks/stream`         | key* | Real-time SSE event stream               |
| GET    | `/api/stats`                   | key  | Aggregate counts / success rate          |
| POST   | `/api/dlq/purge`               | key  | Delete failed/DLQ entries                |
| GET    | `/api/vaults`                  | key  | List your vaults                         |
| POST   | `/api/vaults`                  | key  | Create a vault (returns signing secret)  |
| GET    | `/api/vaults/[id]`             | key  | Get one vault                            |
| PATCH  | `/api/vaults/[id]`             | key  | Update / pause / rotate secret           |
| DELETE | `/api/vaults/[id]`             | key  | Delete a vault                           |
| GET    | `/api/vaults/[id]/activity`    | key  | Vault audit log                          |
| POST   | `/api/dlq/replay`              | key  | Re-enqueue DLQ/failed entries            |
| GET    | `/api/keys`                    | key  | List API keys                            |
| POST   | `/api/keys`                    | key  | Create an API key                        |

\* The SSE stream accepts the API key via an `?apiKey=hv_...` query param, since
the browser's `EventSource` cannot send an `Authorization` header. Ingestion,
the worker, and replay publish events to a Redis channel (`hookvault:events`);
the stream forwards them to the browser filtered by the authenticated user.

## Real-time flow

```
ingest / worker / replay ──publish──▶ Redis (hookvault:events)
                                          │
                   GET /api/webhooks/stream (SSE, per-user filter)
                                          │
                                    browser EventSource ──▶ React Query invalidate
```

## Outbound signature scheme

Each delivery carries an `X-HookVault-Signature: t=<unix>,v1=<hmac>` header,
where `v1 = HMAC_SHA256(vault.secret, "<t>.<rawBody>")`. Receivers should verify
it and reject timestamps outside a ~5 minute tolerance. See `lib/hmac.ts`
(`verifySignature`) for a reference implementation.

## Delivery semantics

- Retries: 5 attempts, exponential backoff (1s → 16s) — see `lib/queue.ts`.
- Status lifecycle: `PENDING → RETRYING → (SUCCESS | DLQ)`.
- DLQ entries can be replayed via `POST /api/dlq/replay`.
