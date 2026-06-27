-- Migration: 010_payroll_tables.sql
-- Payroll module: employees and payroll_runs

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  designation text,
  department text,
  basic_salary numeric(18,2) DEFAULT 0,
  hra_percent numeric(5,2) DEFAULT 40,
  other_allowances numeric(18,2) DEFAULT 0,
  pf_applicable boolean DEFAULT true,
  esi_applicable boolean DEFAULT true,
  tds_section text DEFAULT 'None',
  tds_rate numeric(5,2) DEFAULT 0,
  bank_account text,
  bank_name text,
  ifsc text,
  joining_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees(tenant_id);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month int NOT NULL,
  year int NOT NULL,
  total_gross numeric(18,2) DEFAULT 0,
  total_net numeric(18,2) DEFAULT 0,
  journal_entry_id uuid REFERENCES journal_entries(id),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_tenant_id ON payroll_runs(tenant_id);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY employees_tenant_isolation ON employees
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY payroll_runs_tenant_isolation ON payroll_runs
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND is_active = true));
