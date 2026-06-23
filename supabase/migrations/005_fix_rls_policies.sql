-- ──────────────────────────────────────────────────────────────────
-- 005: Fix RLS policies to use auth.uid() instead of JWT custom claims
-- current_tenant_id() reads tenant_id from JWT — never populated in
-- standard Supabase JWTs, so all tenant-scoped queries return 0 rows.
-- ──────────────────────────────────────────────────────────────────

-- 1. tenants: allow users to SELECT tenants they are a member of
DROP POLICY IF EXISTS tenants_select ON tenants;
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 2. tenant_users: allow users to SELECT their own membership rows
--    (needed for getActiveTenantUser helper)
DROP POLICY IF EXISTS tenant_isolation_tenant_users ON tenant_users;
CREATE POLICY tenant_isolation_tenant_users ON tenant_users FOR ALL
  USING (
    user_id = auth.uid()
    OR tenant_id IN (
      SELECT tenant_id FROM tenant_users tu2
      WHERE tu2.user_id = auth.uid() AND tu2.is_active = true AND tu2.role IN ('owner','superadmin')
    )
  );

-- 3. tenant-scoped tables: replace JWT-based policy with direct uid lookup
DROP POLICY IF EXISTS tenant_isolation_accounts ON accounts;
CREATE POLICY tenant_isolation_accounts ON accounts FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS tenant_isolation_parties ON parties;
CREATE POLICY tenant_isolation_parties ON parties FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS tenant_isolation_journal_entries ON journal_entries;
CREATE POLICY tenant_isolation_journal_entries ON journal_entries FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS tenant_isolation_journal_lines ON journal_lines;
CREATE POLICY tenant_isolation_journal_lines ON journal_lines FOR ALL
  USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries
      WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

DROP POLICY IF EXISTS tenant_isolation_tenant_modules ON tenant_modules;
CREATE POLICY tenant_isolation_tenant_modules ON tenant_modules FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS audit_log_select ON audit_log;
CREATE POLICY audit_log_select ON audit_log FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
