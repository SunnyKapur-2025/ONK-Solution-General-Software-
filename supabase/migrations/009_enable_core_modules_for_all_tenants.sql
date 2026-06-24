-- Migration 009: Enable core modules for all existing tenants
-- Fixes: purchases, receipts, payments, bank tabs not visible because
-- they were missing from industry defaultModules and never seeded.

DO $$
DECLARE
  v_tenant_id uuid;
  v_module text;
  v_core_modules text[] := ARRAY[
    'purchases', 'receipts', 'payments', 'bank',
    'dashboard', 'sales', 'expenses', 'reports'
  ];
BEGIN
  FOR v_tenant_id IN SELECT id FROM tenants WHERE is_active = true LOOP
    FOREACH v_module IN ARRAY v_core_modules LOOP
      INSERT INTO tenant_modules (tenant_id, module_key, is_enabled, enabled_by)
      VALUES (v_tenant_id, v_module, true, NULL)
      ON CONFLICT (tenant_id, module_key) DO UPDATE SET is_enabled = true;
    END LOOP;
  END LOOP;
END;
$$;
