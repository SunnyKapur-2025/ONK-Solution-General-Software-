-- ─────────────────────────────────────────────────────────────
-- 003: Self-service company creation + party-to-ledger linkage
-- ─────────────────────────────────────────────────────────────

-- 1. Link parties to a ledger account (auto-created)
ALTER TABLE parties
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);

CREATE INDEX IF NOT EXISTS idx_parties_account ON parties(account_id);

-- 2. Per-user, per-module permission overrides (role still applies)
CREATE TABLE IF NOT EXISTS tenant_user_modules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  module_key      text NOT NULL,
  can_read        boolean NOT NULL DEFAULT true,
  can_write       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, module_key)
);

ALTER TABLE tenant_user_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tum_select ON tenant_user_modules;
CREATE POLICY tum_select ON tenant_user_modules FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS tum_write ON tenant_user_modules;
CREATE POLICY tum_write ON tenant_user_modules FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
        WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner','superadmin')
    )
  );

-- 3. Allow signed-in users to insert a tenant they create themselves.
--    Existing RLS on tenants is superadmin-only — we relax INSERT.
DROP POLICY IF EXISTS tenants_self_create ON tenants;
CREATE POLICY tenants_self_create ON tenants FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- 4. Allow user to insert their own tenant_users row (only for tenants they created)
DROP POLICY IF EXISTS tu_self_owner ON tenant_users;
CREATE POLICY tu_self_owner ON tenant_users FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id IN (SELECT id FROM tenants WHERE created_by = auth.uid())
  );
