-- ──────────────────────────────────────────────────────────────────
-- 004: SECURITY DEFINER company creation + Tally-style ledger fields
-- ──────────────────────────────────────────────────────────────────

-- 1. Tally-style extra columns on accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS alias                text,
  ADD COLUMN IF NOT EXISTS gst_registration_type text DEFAULT 'unregistered',
  ADD COLUMN IF NOT EXISTS hsn_sac               text,
  ADD COLUMN IF NOT EXISTS maintain_bill_by_bill boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_credit_period  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS check_credit_days      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_account_no        text,
  ADD COLUMN IF NOT EXISTS bank_ifsc              text,
  ADD COLUMN IF NOT EXISTS bank_name              text,
  ADD COLUMN IF NOT EXISTS country                text DEFAULT 'India';

-- 2. Tally-style extra columns on parties
ALTER TABLE parties
  ADD COLUMN IF NOT EXISTS alias                  text,
  ADD COLUMN IF NOT EXISTS mailing_name           text,
  ADD COLUMN IF NOT EXISTS registration_type      text DEFAULT 'Regular',
  ADD COLUMN IF NOT EXISTS maintain_bill_by_bill  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_credit_period  integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS check_credit_days      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_account_no        text,
  ADD COLUMN IF NOT EXISTS bank_ifsc              text,
  ADD COLUMN IF NOT EXISTS bank_name              text,
  ADD COLUMN IF NOT EXISTS country                text DEFAULT 'India';

-- account_id added in 003; add IF NOT EXISTS guard for idempotency
ALTER TABLE parties
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id);

CREATE INDEX IF NOT EXISTS idx_parties_account ON parties(account_id);

-- 3. SECURITY DEFINER function for self-service company creation
--    Runs with the privilege of the function owner (bypasses RLS for
--    the multi-table bootstrap), so the app never needs service-role key.
CREATE OR REPLACE FUNCTION create_company_for_user(
  p_name                  text,
  p_slug                  text,
  p_industry_id           text,
  p_gstin                 text    DEFAULT NULL,
  p_pan                   text    DEFAULT NULL,
  p_phone                 text    DEFAULT NULL,
  p_email                 text    DEFAULT NULL,
  p_address               text    DEFAULT NULL,
  p_city                  text    DEFAULT NULL,
  p_state                 text    DEFAULT NULL,
  p_pincode               text    DEFAULT NULL,
  p_financial_year_start  integer DEFAULT 4,
  p_subscription_plan     text    DEFAULT 'starter',
  p_modules               text[]  DEFAULT ARRAY[]::text[]
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid;
  v_tenant_id uuid;
  v_name      text;
  v_email     text;
  v_module    text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Pull name + email from auth.users for the owner record
  SELECT
    COALESCE(raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    u.email
  INTO v_name, v_email
  FROM auth.users u
  WHERE u.id = v_user_id;

  -- Create tenant
  INSERT INTO tenants (
    name, slug, industry_id, gstin, pan, phone, email,
    address, city, state, pincode,
    financial_year_start, subscription_plan, created_by
  ) VALUES (
    p_name, p_slug, p_industry_id,
    NULLIF(p_gstin,''), NULLIF(p_pan,''),
    NULLIF(p_phone,''), NULLIF(p_email,''),
    NULLIF(p_address,''), NULLIF(p_city,''),
    NULLIF(p_state,''), NULLIF(p_pincode,''),
    p_financial_year_start, p_subscription_plan, v_user_id
  )
  RETURNING id INTO v_tenant_id;

  -- Create owner membership
  INSERT INTO tenant_users (tenant_id, user_id, role, name, email)
  VALUES (v_tenant_id, v_user_id, 'owner', v_name, v_email);

  -- Enable modules
  FOREACH v_module IN ARRAY p_modules LOOP
    INSERT INTO tenant_modules (tenant_id, module_key, is_enabled, enabled_by)
    VALUES (v_tenant_id, v_module, true, v_user_id)
    ON CONFLICT (tenant_id, module_key) DO NOTHING;
  END LOOP;

  -- Seed chart of accounts (function defined in 001, also SECURITY DEFINER)
  BEGIN
    PERFORM seed_chart_of_accounts(v_tenant_id);
  EXCEPTION WHEN OTHERS THEN
    -- Non-fatal: log to postgres log but don't fail company creation
    RAISE WARNING 'CoA seed failed for tenant %: %', v_tenant_id, SQLERRM;
  END;

  RETURN v_tenant_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_company_for_user TO authenticated;

-- 4. tenant_user_modules (idempotent — also in 003)
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
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users
    WHERE user_id = auth.uid() AND is_active = true
  ));

DROP POLICY IF EXISTS tum_write ON tenant_user_modules;
CREATE POLICY tum_write ON tenant_user_modules FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users
    WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner','superadmin')
  ));
