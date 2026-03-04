/* 
# HookVault Core Schema
1. New Tables
  - `vaults_20240520`: Stores webhook destination configurations.
  - `webhook_entries_20240520`: Stores captured webhook payloads and metadata.
  - `delivery_attempts_20240520`: Logs every delivery attempt for traceability.

2. Security
  - RLS enabled on all tables.
  - Policies for authenticated users to manage their own vaults and webhooks.
*/

-- Vaults Table
CREATE TABLE IF NOT EXISTS vaults_20240520 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  target_url text NOT NULL,
  secret text DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Webhook Entries Table
CREATE TABLE IF NOT EXISTS webhook_entries_20240520 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id uuid REFERENCES vaults_20240520(id) ON DELETE CASCADE,
  idempotency_key text UNIQUE NOT NULL,
  source text DEFAULT 'unknown',
  method text DEFAULT 'POST',
  payload jsonb NOT NULL,
  headers jsonb NOT NULL,
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'DLQ')),
  created_at timestamptz DEFAULT now()
);

-- Delivery Attempts Table
CREATE TABLE IF NOT EXISTS delivery_attempts_20240520 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES webhook_entries_20240520(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  response_code integer,
  response_body text,
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Security
ALTER TABLE vaults_20240520 ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_entries_20240520 ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_attempts_20240520 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vaults" ON vaults_20240520
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view webhooks for their vaults" ON webhook_entries_20240520
  FOR SELECT TO authenticated USING (
    vault_id IN (SELECT id FROM vaults_20240520 WHERE user_id = auth.uid())
  );