-- ============================================================
-- 008_demo_seed_data.sql
--
-- This migration does NOT insert any data automatically.
-- Run seed_demo_data('your-tenant-uuid') to load sample data.
--
-- Usage:
--   SELECT seed_demo_data('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
-- ============================================================

CREATE OR REPLACE FUNCTION seed_demo_data(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Party IDs
  v_tcs_id         uuid := gen_random_uuid();
  v_infosys_id     uuid := gen_random_uuid();
  v_officedepot_id uuid := gen_random_uuid();
  v_amazon_id      uuid := gen_random_uuid();
  v_reliance_id    uuid := gen_random_uuid();

  -- Account IDs (receivables / payables linked to parties)
  v_tcs_acc_id         uuid := gen_random_uuid();
  v_infosys_acc_id     uuid := gen_random_uuid();
  v_officedepot_acc_id uuid := gen_random_uuid();
  v_amazon_acc_id      uuid := gen_random_uuid();
  v_reliance_acc_id    uuid := gen_random_uuid();

  -- Core GL account IDs
  v_sales_acc_id      uuid;
  v_purchase_acc_id   uuid;
  v_bank_acc_id       uuid;

  -- Journal entry IDs
  v_je1  uuid := gen_random_uuid();
  v_je2  uuid := gen_random_uuid();
  v_je3  uuid := gen_random_uuid();
  v_je4  uuid := gen_random_uuid();
  v_je5  uuid := gen_random_uuid();
  v_je6  uuid := gen_random_uuid();
  v_je7  uuid := gen_random_uuid();
  v_je8  uuid := gen_random_uuid();
  v_je9  uuid := gen_random_uuid();
  v_je10 uuid := gen_random_uuid();

  -- A dummy user uuid for created_by (system seed)
  v_system_user uuid := '00000000-0000-0000-0000-000000000001';

  -- Current financial year start (April 1)
  v_fy_start date;
BEGIN
  -- Determine financial year start
  v_fy_start := CASE
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 4
    THEN DATE_TRUNC('year', CURRENT_DATE)::date + INTERVAL '3 months'
    ELSE DATE_TRUNC('year', CURRENT_DATE)::date - INTERVAL '9 months'
  END;

  -- ----------------------------------------------------------------
  -- 1. Insert GL accounts for parties
  --    Customers → sub_type trade_receivable  (code 1630.XXXX)
  --    Vendors   → sub_type trade_payable     (code 2100.XXXX)
  -- ----------------------------------------------------------------
  INSERT INTO accounts (id, tenant_id, code, name, type, sub_type, normal_balance, is_active, created_at)
  VALUES
    (v_tcs_acc_id,         p_tenant_id, '1630.0001', 'TCS — Receivable',                  'asset',     'trade_receivable', 'dr', true, NOW()),
    (v_infosys_acc_id,     p_tenant_id, '1630.0002', 'Infosys — Receivable',               'asset',     'trade_receivable', 'dr', true, NOW()),
    (v_officedepot_acc_id, p_tenant_id, '2100.0001', 'Office Depot — Payable',             'liability', 'trade_payable',    'cr', true, NOW()),
    (v_amazon_acc_id,      p_tenant_id, '2100.0002', 'Amazon Business — Payable',          'liability', 'trade_payable',    'cr', true, NOW()),
    (v_reliance_acc_id,    p_tenant_id, '1630.0003', 'Reliance Industries — Receivable',   'asset',     'trade_receivable', 'dr', true, NOW());

  -- Core operating accounts (insert or reuse existing)
  INSERT INTO accounts (id, tenant_id, code, name, type, sub_type, normal_balance, is_active, created_at)
  VALUES
    (gen_random_uuid(), p_tenant_id, '4000.0001', 'Sales — IT Services',       'income',   'revenue_from_operations', 'cr', true, NOW()),
    (gen_random_uuid(), p_tenant_id, '5000.0001', 'Purchase — Office Supplies','expense',  'cost_of_goods_sold',      'dr', true, NOW()),
    (gen_random_uuid(), p_tenant_id, '1100.0001', 'HDFC Bank Current Account', 'asset',    'bank',                    'dr', true, NOW())
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- Fetch the IDs of the core accounts (may have been pre-existing)
  SELECT id INTO v_sales_acc_id    FROM accounts WHERE tenant_id = p_tenant_id AND code = '4000.0001';
  SELECT id INTO v_purchase_acc_id FROM accounts WHERE tenant_id = p_tenant_id AND code = '5000.0001';
  SELECT id INTO v_bank_acc_id     FROM accounts WHERE tenant_id = p_tenant_id AND code = '1100.0001';

  -- ----------------------------------------------------------------
  -- 2. Insert parties
  -- ----------------------------------------------------------------
  INSERT INTO parties (id, tenant_id, name, type, gstin, phone, email, address, account_id, created_at)
  VALUES
    (v_tcs_id,         p_tenant_id, 'Tata Consultancy Services', 'customer', '27AABCT1332L1ZN', '022-67789999',   'accounts@tcs.com',      'TCS House, Raveline Street, Mumbai 400001',               v_tcs_acc_id,         NOW()),
    (v_infosys_id,     p_tenant_id, 'Infosys Ltd',               'customer', '29AABCI1681J1ZN', '080-28520261',   'billing@infosys.com',   'Electronics City, Hosur Road, Bengaluru 560100',         v_infosys_acc_id,     NOW()),
    (v_officedepot_id, p_tenant_id, 'Office Depot India',        'vendor',   '07AACFO1234A1Z1', '011-41234567',   'purchase@officedepot.in','Plot 5, Sector 18, Gurugram 122001',                    v_officedepot_acc_id, NOW()),
    (v_amazon_id,      p_tenant_id, 'Amazon Business',           'vendor',   '29AABCA1234F1ZA', '1800-3000-9009', 'vendor@amazon.in',       'Brigade Gateway, 26/1 Dr Rajkumar Road, Bengaluru 560055',v_amazon_acc_id,      NOW()),
    (v_reliance_id,    p_tenant_id, 'Reliance Industries',       'both',     '27AAACR5055K1ZW', '022-33555000',   'trade@ril.com',          'Maker Chambers IV, Nariman Point, Mumbai 400021',        v_reliance_acc_id,    NOW());

  -- ----------------------------------------------------------------
  -- 3. Journal entries — 10 entries covering sales, purchase,
  --    receipt, payment. Realistic Indian amounts ₹50,000–₹5,00,000.
  -- ----------------------------------------------------------------

  -- JE-001  Sales to TCS  ₹3,00,000
  INSERT INTO journal_entries (id, tenant_id, entry_number, entry_date, reference, narration, voucher_type, status, created_by, created_at)
  VALUES (v_je1, p_tenant_id, 'JE-DEMO-001', v_fy_start + 15, 'INV-2025-001', 'IT services rendered to TCS for Apr 2025', 'sales', 'posted', v_system_user, NOW());
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, narration)
  VALUES
    (p_tenant_id, v_je1, v_tcs_acc_id,   300000, 0,      'TCS — Receivable'),
    (p_tenant_id, v_je1, v_sales_acc_id, 0,      300000, 'Sales — IT Services');

  -- JE-002  Sales to Infosys  ₹4,50,000
  INSERT INTO journal_entries (id, tenant_id, entry_number, entry_date, reference, narration, voucher_type, status, created_by, created_at)
  VALUES (v_je2, p_tenant_id, 'JE-DEMO-002', v_fy_start + 20, 'INV-2025-002', 'Software consulting services to Infosys May 2025', 'sales', 'posted', v_system_user, NOW());
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, narration)
  VALUES
    (p_tenant_id, v_je2, v_infosys_acc_id, 450000, 0,      'Infosys — Receivable'),
    (p_tenant_id, v_je2, v_sales_acc_id,   0,      450000, 'Sales — IT Services');

  -- JE-003  Purchase from Office Depot  ₹85,000
  INSERT INTO journal_entries (id, tenant_id, entry_number, entry_date, reference, narration, voucher_type, status, created_by, created_at)
  VALUES (v_je3, p_tenant_id, 'JE-DEMO-003', v_fy_start + 10, 'BILL-2025-001', 'Office supplies — stationery and printer cartridges', 'purchase', 'posted', v_system_user, NOW());
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, narration)
  VALUES
    (p_tenant_id, v_je3, v_purchase_acc_id,    85000, 0,     'Purchase — Office Supplies'),
    (p_tenant_id, v_je3, v_officedepot_acc_id, 0,     85000, 'Office Depot — Payable');

  -- JE-004  Purchase from Amazon Business  ₹1,20,000
  INSERT INTO journal_entries (id, tenant_id, entry_number, entry_date, reference, narration, voucher_type, status, created_by, created_at)
  VALUES (v_je4, p_tenant_id, 'JE-DEMO-004', v_fy_start + 25, 'BILL-2025-002', 'Laptop accessories and networking equipment', 'purchase', 'posted', v_system_user, NOW());
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, narration)
  VALUES
    (p_tenant_id, v_je4, v_purchase_acc_id, 120000, 0,      'Purchase — Office Supplies'),
    (p_tenant_id, v_je4, v_amazon_acc_id,   0,      120000, 'Amazon Business — Payable');

  -- JE-005  Receipt from TCS  ₹2,00,000 partial
  INSERT INTO journal_entries (id, tenant_id, entry_number, entry_date, reference, narration, voucher_type, status, created_by, created_at)
  VALUES (v_je5, p_tenant_id, 'JE-DEMO-005', v_fy_start + 30, 'RCT-2025-001', 'Part payment received from TCS against INV-2025-001', 'receipt', 'posted', v_system_user, NOW());
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, narration)
  VALUES
    (p_tenant_id, v_je5, v_bank_acc_id, 200000, 0,      'HDFC Bank — Receipt'),
    (p_tenant_id, v_je5, v_tcs_acc_id,  0,      200000, 'TCS — Receivable');

  -- JE-006  Receipt from Infosys  ₹4,50,000 full settlement
  INSERT INTO journal_entries (id, tenant_id, entry_number, entry_date, reference, narration, voucher_type, status, created_by, created_at)
  VALUES (v_je6, p_tenant_id, 'JE-DEMO-006', v_fy_start + 45, 'RCT-2025-002', 'Full payment received from Infosys for INV-2025-002', 'receipt', 'posted', v_system_user, NOW());
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, narration)
  VALUES
    (p_tenant_id, v_je6, v_bank_acc_id,    450000, 0,      'HDFC Bank — Receipt'),
    (p_tenant_id, v_je6, v_infosys_acc_id, 0,      450000, 'Infosys — Receivable');

  -- JE-007  Receipt from Reliance  ₹5,00,000 advance
  INSERT INTO journal_entries (id, tenant_id, entry_number, entry_date, reference, narration, voucher_type, status, created_by, created_at)
  VALUES (v_je7, p_tenant_id, 'JE-DEMO-007', v_fy_start + 60, 'RCT-2025-003', 'Advance received from Reliance Industries for upcoming project', 'receipt', 'posted', v_system_user, NOW());
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, narration)
  VALUES
    (p_tenant_id, v_je7, v_bank_acc_id,     500000, 0,      'HDFC Bank — Advance Receipt'),
    (p_tenant_id, v_je7, v_reliance_acc_id, 0,      500000, 'Reliance Industries — Advance');

  -- JE-008  Payment to Office Depot  ₹85,000 full settlement
  INSERT INTO journal_entries (id, tenant_id, entry_number, entry_date, reference, narration, voucher_type, status, created_by, created_at)
  VALUES (v_je8, p_tenant_id, 'JE-DEMO-008', v_fy_start + 35, 'PMT-2025-001', 'Full payment to Office Depot against BILL-2025-001', 'payment', 'posted', v_system_user, NOW());
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, narration)
  VALUES
    (p_tenant_id, v_je8, v_officedepot_acc_id, 85000, 0,     'Office Depot — Payable settled'),
    (p_tenant_id, v_je8, v_bank_acc_id,        0,     85000, 'HDFC Bank — Payment');

  -- JE-009  Partial payment to Amazon  ₹50,000
  INSERT INTO journal_entries (id, tenant_id, entry_number, entry_date, reference, narration, voucher_type, status, created_by, created_at)
  VALUES (v_je9, p_tenant_id, 'JE-DEMO-009', v_fy_start + 50, 'PMT-2025-002', 'Part payment to Amazon Business against BILL-2025-002', 'payment', 'posted', v_system_user, NOW());
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, narration)
  VALUES
    (p_tenant_id, v_je9, v_amazon_acc_id, 50000, 0,     'Amazon Business — Payable partial'),
    (p_tenant_id, v_je9, v_bank_acc_id,   0,     50000, 'HDFC Bank — Payment');

  -- JE-010  Sales to Reliance Industries  ₹2,75,000
  INSERT INTO journal_entries (id, tenant_id, entry_number, entry_date, reference, narration, voucher_type, status, created_by, created_at)
  VALUES (v_je10, p_tenant_id, 'JE-DEMO-010', v_fy_start + 75, 'INV-2025-003', 'IT infrastructure consulting services to Reliance', 'sales', 'posted', v_system_user, NOW());
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, narration)
  VALUES
    (p_tenant_id, v_je10, v_reliance_acc_id, 275000, 0,      'Reliance Industries — Receivable'),
    (p_tenant_id, v_je10, v_sales_acc_id,    0,      275000, 'Sales — IT Services');

END;
$$;

GRANT EXECUTE ON FUNCTION seed_demo_data(uuid) TO authenticated;

COMMENT ON FUNCTION seed_demo_data(uuid) IS
  'Inserts demo parties, accounts, and journal entries for the given tenant. '
  'Run as: SELECT seed_demo_data(''your-tenant-uuid'');';
