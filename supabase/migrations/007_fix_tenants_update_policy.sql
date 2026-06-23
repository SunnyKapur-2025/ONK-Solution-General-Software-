-- ──────────────────────────────────────────────────────────────────
-- 007: Fix tenants UPDATE/INSERT policies still using current_tenant_id()
-- ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS tenants_update ON tenants;
CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (id = ANY(get_my_tenant_ids()))
  WITH CHECK (id = ANY(get_my_tenant_ids()));

DROP POLICY IF EXISTS tenants_insert ON tenants;
DROP POLICY IF EXISTS tenants_self_create ON tenants;
CREATE POLICY tenants_insert ON tenants FOR INSERT
  WITH CHECK (created_by = auth.uid());
