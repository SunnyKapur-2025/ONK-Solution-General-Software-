-- ============================================================
-- ONK Solution — Phase 1 Foundation Migration
-- Run this in Supabase SQL Editor or via supabase db push
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- TENANTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  slug                  text NOT NULL UNIQUE,
  industry_id           text NOT NULL,
  gstin                 text,
  pan                   text,
  address               text,
  city                  text,
  state                 text,
  pincode               text,
  phone                 text,
  email                 text,
  logo_url              text,
  financial_year_start  integer NOT NULL DEFAULT 4, -- April
  is_active             boolean NOT NULL DEFAULT true,
  subscription_plan     text NOT NULL DEFAULT 'starter'
                          CHECK (subscription_plan IN ('starter','professional','enterprise','onetime')),
  subscription_expires_at timestamptz,
  created_by            uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- TENANT USERS (role per user per tenant)
-- ────────────────────────────────────────────────────────────
CREATE TABLE tenant_users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,  -- references auth.users
  role       text NOT NULL DEFAULT 'staff'
               CHECK (role IN ('owner','accountant','manager','staff','superadmin')),
  name       text NOT NULL,
  email      text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- ────────────────────────────────────────────────────────────
-- TENANT MODULES (developer-controlled per client)
-- ────────────────────────────────────────────────────────────
CREATE TABLE tenant_modules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  enabled_by uuid,  -- developer user_id
  enabled_at timestamptz,
  UNIQUE(tenant_id, module_key)
);

-- ────────────────────────────────────────────────────────────
-- CHART OF ACCOUNTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code                  text NOT NULL,
  name                  text NOT NULL,
  type                  text NOT NULL
                          CHECK (type IN ('asset','liability','equity','income','expense')),
  sub_type              text NOT NULL,
  parent_id             uuid REFERENCES accounts(id),
  is_system             boolean NOT NULL DEFAULT false, -- system accounts cannot be deleted
  is_active             boolean NOT NULL DEFAULT true,
  opening_balance       numeric(18,2) NOT NULL DEFAULT 0,
  opening_balance_type  text NOT NULL DEFAULT 'dr' CHECK (opening_balance_type IN ('dr','cr')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- ────────────────────────────────────────────────────────────
-- PARTIES (Customers, Vendors, Both)
-- ────────────────────────────────────────────────────────────
CREATE TABLE parties (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('customer','vendor','both')),
  gstin       text,
  pan         text,
  phone       text,
  email       text,
  address     text,
  city        text,
  state       text,
  pincode     text,
  credit_days integer DEFAULT 30,
  credit_limit numeric(18,2) DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- JOURNAL ENTRIES (double-entry core)
-- ────────────────────────────────────────────────────────────
CREATE TABLE journal_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_number  text NOT NULL,
  entry_date    date NOT NULL,
  narration     text NOT NULL,
  reference     text,
  voucher_type  text NOT NULL
                  CHECK (voucher_type IN ('journal','payment','receipt','sales','purchase','contra','credit_note','debit_note')),
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','posted','cancelled')),
  created_by    uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, entry_number)
);

-- ────────────────────────────────────────────────────────────
-- JOURNAL LINES (each leg of the entry)
-- ────────────────────────────────────────────────────────────
CREATE TABLE journal_lines (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id       uuid NOT NULL REFERENCES accounts(id),
  debit            numeric(18,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit           numeric(18,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  narration        text,
  party_id         uuid REFERENCES parties(id),
  cost_centre      text,
  CONSTRAINT one_side_only CHECK (NOT (debit > 0 AND credit > 0))
);

-- ────────────────────────────────────────────────────────────
-- ENFORCE BALANCED ENTRIES (debit = credit per journal)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_total_debit  numeric(18,2);
  v_total_credit numeric(18,2);
BEGIN
  -- Only enforce on posted entries
  IF (SELECT status FROM journal_entries WHERE id = NEW.journal_entry_id) = 'posted' THEN
    SELECT
      COALESCE(SUM(debit),0),
      COALESCE(SUM(credit),0)
    INTO v_total_debit, v_total_credit
    FROM journal_lines
    WHERE journal_entry_id = NEW.journal_entry_id;

    IF v_total_debit <> v_total_credit THEN
      RAISE EXCEPTION 'Journal entry is not balanced. Debit: %, Credit: %',
        v_total_debit, v_total_credit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journal_balance
AFTER INSERT OR UPDATE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION check_journal_balance();

-- ────────────────────────────────────────────────────────────
-- AUDIT LOG (immutable — no update/delete allowed)
-- ────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid,
  user_id     uuid,
  action      text NOT NULL,  -- 'INSERT' | 'UPDATE' | 'DELETE'
  table_name  text NOT NULL,
  record_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Prevent tampering with audit log
CREATE RULE no_update_audit AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_log (tenant_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach audit trigger to financial tables
CREATE TRIGGER audit_journal_entries
AFTER INSERT OR UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_journal_lines
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
ALTER TABLE tenants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties          ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's tenant_id from JWT
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid
$$;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT (auth.jwt() ->> 'user_role')
$$;

-- Tenants: superadmin sees all; others see only their own
CREATE POLICY "tenants_select" ON tenants FOR SELECT
  USING (id = current_tenant_id() OR current_user_role() = 'superadmin');

CREATE POLICY "tenants_insert" ON tenants FOR INSERT
  WITH CHECK (current_user_role() = 'superadmin');

CREATE POLICY "tenants_update" ON tenants FOR UPDATE
  USING (id = current_tenant_id() AND current_user_role() IN ('owner','superadmin'));

-- Tenant isolation policy for all tenant-scoped tables
CREATE POLICY "tenant_isolation_tenant_users"    ON tenant_users    FOR ALL USING (tenant_id = current_tenant_id() OR current_user_role() = 'superadmin');
CREATE POLICY "tenant_isolation_tenant_modules"  ON tenant_modules  FOR ALL USING (tenant_id = current_tenant_id() OR current_user_role() = 'superadmin');
CREATE POLICY "tenant_isolation_accounts"        ON accounts        FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "tenant_isolation_parties"         ON parties         FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "tenant_isolation_journal_entries" ON journal_entries FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "tenant_isolation_journal_lines"   ON journal_lines   FOR ALL USING (tenant_id = current_tenant_id());
CREATE POLICY "audit_log_select"                 ON audit_log       FOR SELECT USING (tenant_id = current_tenant_id() OR current_user_role() = 'superadmin');

-- Module updates only by superadmin
CREATE POLICY "modules_update_superadmin" ON tenant_modules FOR UPDATE
  USING (current_user_role() = 'superadmin');

-- ────────────────────────────────────────────────────────────
-- DEFAULT CHART OF ACCOUNTS (system seed — Schedule III)
-- Called after tenant creation via application layer
-- ────────────────────────────────────────────────────────────

-- This function seeds a standard Indian chart of accounts for a new tenant
CREATE OR REPLACE FUNCTION seed_chart_of_accounts(p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO accounts (tenant_id, code, name, type, sub_type, is_system) VALUES
  -- ── ASSETS ─────────────────────────────────────────────
  (p_tenant_id, '1000', 'Fixed Assets',               'asset',   'fixed_asset',      true),
  (p_tenant_id, '1100', 'Land & Building',             'asset',   'fixed_asset',      true),
  (p_tenant_id, '1200', 'Plant & Machinery',           'asset',   'fixed_asset',      true),
  (p_tenant_id, '1300', 'Furniture & Fixtures',        'asset',   'fixed_asset',      true),
  (p_tenant_id, '1400', 'Vehicles',                    'asset',   'fixed_asset',      true),
  (p_tenant_id, '1500', 'Computer & Equipment',        'asset',   'fixed_asset',      true),
  (p_tenant_id, '1600', 'Current Assets',              'asset',   'current_asset',    true),
  (p_tenant_id, '1610', 'Cash in Hand',                'asset',   'cash',             true),
  (p_tenant_id, '1620', 'Bank Accounts',               'asset',   'bank',             true),
  (p_tenant_id, '1630', 'Sundry Debtors',              'asset',   'debtor',           true),
  (p_tenant_id, '1640', 'Advance to Suppliers',        'asset',   'advance',          true),
  (p_tenant_id, '1650', 'Input GST (CGST)',            'asset',   'tax',              true),
  (p_tenant_id, '1651', 'Input GST (SGST)',            'asset',   'tax',              true),
  (p_tenant_id, '1652', 'Input GST (IGST)',            'asset',   'tax',              true),
  (p_tenant_id, '1660', 'TDS Receivable',              'asset',   'tax',              true),
  (p_tenant_id, '1670', 'Stock in Hand',               'asset',   'stock',            true),
  (p_tenant_id, '1680', 'Prepaid Expenses',            'asset',   'prepaid',          true),
  (p_tenant_id, '1690', 'Loans & Advances (Asset)',    'asset',   'loan',             true),

  -- ── LIABILITIES ────────────────────────────────────────
  (p_tenant_id, '2000', 'Share Capital',               'liability','equity',          true),
  (p_tenant_id, '2100', 'Reserves & Surplus',          'liability','reserve',         true),
  (p_tenant_id, '2200', 'Long Term Borrowings',        'liability','long_term_loan',  true),
  (p_tenant_id, '2300', 'Current Liabilities',         'liability','current_liability',true),
  (p_tenant_id, '2310', 'Sundry Creditors',            'liability','creditor',        true),
  (p_tenant_id, '2320', 'Advance from Customers',      'liability','advance',         true),
  (p_tenant_id, '2330', 'Output GST (CGST)',           'liability','tax',             true),
  (p_tenant_id, '2331', 'Output GST (SGST)',           'liability','tax',             true),
  (p_tenant_id, '2332', 'Output GST (IGST)',           'liability','tax',             true),
  (p_tenant_id, '2340', 'TDS Payable',                 'liability','tax',             true),
  (p_tenant_id, '2350', 'Salary Payable',              'liability','payable',         true),
  (p_tenant_id, '2360', 'PF Payable',                  'liability','payable',         true),
  (p_tenant_id, '2370', 'ESI Payable',                 'liability','payable',         true),
  (p_tenant_id, '2380', 'Short Term Loans',            'liability','short_term_loan', true),

  -- ── EQUITY ─────────────────────────────────────────────
  (p_tenant_id, '3000', 'Capital Account',             'equity',  'capital',          true),
  (p_tenant_id, '3100', 'Drawings',                    'equity',  'drawings',         true),
  (p_tenant_id, '3200', 'Retained Earnings',           'equity',  'retained',         true),

  -- ── INCOME ─────────────────────────────────────────────
  (p_tenant_id, '4000', 'Sales / Revenue',             'income',  'revenue',          true),
  (p_tenant_id, '4100', 'Service Income',              'income',  'revenue',          true),
  (p_tenant_id, '4200', 'Other Operating Income',      'income',  'other_income',     true),
  (p_tenant_id, '4300', 'Interest Income',             'income',  'other_income',     true),
  (p_tenant_id, '4400', 'Discount Received',           'income',  'other_income',     true),

  -- ── EXPENSES ───────────────────────────────────────────
  (p_tenant_id, '5000', 'Cost of Services',            'expense', 'direct_expense',   true),
  (p_tenant_id, '5100', 'Salaries & Wages',            'expense', 'direct_expense',   true),
  (p_tenant_id, '5110', 'PF Contribution (Employer)',  'expense', 'direct_expense',   true),
  (p_tenant_id, '5120', 'ESI Contribution (Employer)', 'expense', 'direct_expense',   true),
  (p_tenant_id, '5200', 'Purchases',                   'expense', 'direct_expense',   true),
  (p_tenant_id, '5300', 'Rent',                        'expense', 'indirect_expense', true),
  (p_tenant_id, '5400', 'Electricity',                 'expense', 'indirect_expense', true),
  (p_tenant_id, '5500', 'Office Expenses',             'expense', 'indirect_expense', true),
  (p_tenant_id, '5600', 'Telephone & Internet',        'expense', 'indirect_expense', true),
  (p_tenant_id, '5700', 'Travelling & Conveyance',     'expense', 'indirect_expense', true),
  (p_tenant_id, '5800', 'Depreciation',                'expense', 'indirect_expense', true),
  (p_tenant_id, '5900', 'Bank Charges',                'expense', 'indirect_expense', true),
  (p_tenant_id, '5910', 'Discount Allowed',            'expense', 'indirect_expense', true),
  (p_tenant_id, '5920', 'Miscellaneous Expenses',      'expense', 'indirect_expense', true);
END;
$$;
