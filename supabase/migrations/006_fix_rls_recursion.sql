-- ──────────────────────────────────────────────────────────────────
-- 006: Fix infinite recursion in RLS policies
-- Use SECURITY DEFINER helper function to break circular dependency
-- between tenant_users and tenants policies.
-- ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_tenant_ids()
RETURNS uuid[] LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT ARRAY(
    SELECT tenant_id FROM tenant_users
    WHERE user_id = auth.uid() AND is_active = true
  )
$$;

GRANT EXECUTE ON FUNCTION get_my_tenant_ids TO authenticated;

DROP POLICY IF EXISTS tenants_select ON tenants;
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (id = ANY(get_my_tenant_ids()));

DROP POLICY IF EXISTS tenant_isolation_tenant_users ON tenant_users;
CREATE POLICY tenant_isolation_tenant_users ON tenant_users FOR ALL
  USING (tenant_id = ANY(get_my_tenant_ids()));

DROP POLICY IF EXISTS tenant_isolation_accounts ON accounts;
CREATE POLICY tenant_isolation_accounts ON accounts FOR ALL
  USING (tenant_id = ANY(get_my_tenant_ids()));

DROP POLICY IF EXISTS tenant_isolation_parties ON parties;
CREATE POLICY tenant_isolation_parties ON parties FOR ALL
  USING (tenant_id = ANY(get_my_tenant_ids()));

DROP POLICY IF EXISTS tenant_isolation_journal_entries ON journal_entries;
CREATE POLICY tenant_isolation_journal_entries ON journal_entries FOR ALL
  USING (tenant_id = ANY(get_my_tenant_ids()));

DROP POLICY IF EXISTS tenant_isolation_journal_lines ON journal_lines;
CREATE POLICY tenant_isolation_journal_lines ON journal_lines FOR ALL
  USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries
      WHERE tenant_id = ANY(get_my_tenant_ids())
    )
  );

DROP POLICY IF EXISTS tenant_isolation_tenant_modules ON tenant_modules;
CREATE POLICY tenant_isolation_tenant_modules ON tenant_modules FOR ALL
  USING (tenant_id = ANY(get_my_tenant_ids()));

DROP POLICY IF EXISTS audit_log_select ON audit_log;
CREATE POLICY audit_log_select ON audit_log FOR SELECT
  USING (tenant_id = ANY(get_my_tenant_ids()));
