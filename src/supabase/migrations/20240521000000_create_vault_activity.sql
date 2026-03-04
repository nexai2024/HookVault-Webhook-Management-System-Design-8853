/* 
# Vault Activity & Audit Logging
1. New Tables
  - `vault_activity_20240521`: Stores audit logs for vault configuration changes.
  
2. Columns
  - `id`: Unique identifier
  - `vault_id`: Reference to the vault
  - `action`: Type of change (e.g., 'CONFIG_UPDATE', 'SECRET_ROTATED', 'STATUS_CHANGED', 'TRAFFIC_SPIKE')
  - `actor_email`: Email of the user who performed the action
  - `metadata`: JSONB field to store "before" and "after" states
  - `created_at`: Timestamp of the event

3. Security
  - RLS enabled.
  - Policies for users to view activity only for vaults they own.
*/

CREATE TABLE IF NOT EXISTS vault_activity_20240521 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id uuid REFERENCES vaults_20240520(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_email text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vault_activity_20240521 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity for their vaults" ON vault_activity_20240521
  FOR SELECT TO authenticated USING (
    vault_id IN (SELECT id FROM vaults_20240520 WHERE user_id = auth.uid())
  );

-- Helper index for timeline queries
CREATE INDEX IF NOT EXISTS idx_vault_activity_timeline ON vault_activity_20240521(vault_id, created_at DESC);