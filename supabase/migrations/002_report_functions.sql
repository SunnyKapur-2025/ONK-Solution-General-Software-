-- ============================================================
-- Report helper functions
-- ============================================================

-- Returns account-level debit/credit totals for a date range
-- Used by P&L and Balance Sheet computations
CREATE OR REPLACE FUNCTION get_account_balances(
  p_tenant_id uuid,
  p_from_date date,
  p_to_date   date
)
RETURNS TABLE (
  "accountId"   uuid,
  "accountCode" text,
  "accountName" text,
  "type"        text,
  "subType"     text,
  "debitTotal"  numeric,
  "creditTotal" numeric
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    a.id            AS "accountId",
    a.code          AS "accountCode",
    a.name          AS "accountName",
    a.type          AS "type",
    a.sub_type      AS "subType",
    COALESCE(SUM(jl.debit), 0)  AS "debitTotal",
    COALESCE(SUM(jl.credit), 0) AS "creditTotal"
  FROM accounts a
  LEFT JOIN journal_lines jl ON jl.account_id = a.id
    AND jl.tenant_id = p_tenant_id
  LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
    AND je.status = 'posted'
    AND je.entry_date BETWEEN p_from_date AND p_to_date
  WHERE a.tenant_id = p_tenant_id
    AND a.is_active = true
  GROUP BY a.id, a.code, a.name, a.type, a.sub_type
  ORDER BY a.code;
$$;

-- Returns outstanding balances per party (for aging report)
CREATE OR REPLACE FUNCTION get_party_outstanding(
  p_tenant_id uuid,
  p_party_type text   -- 'customer' | 'vendor'
)
RETURNS TABLE (
  "partyId"   uuid,
  "partyName" text,
  "amount"    numeric,
  "daysOld"   integer
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.id          AS "partyId",
    p.name        AS "partyName",
    SUM(jl.debit - jl.credit) AS "amount",
    CURRENT_DATE - je.entry_date AS "daysOld"
  FROM parties p
  JOIN journal_lines jl ON jl.party_id = p.id
    AND jl.tenant_id = p_tenant_id
  JOIN journal_entries je ON je.id = jl.journal_entry_id
    AND je.status = 'posted'
  WHERE p.tenant_id = p_tenant_id
    AND p.type IN (p_party_type, 'both')
  GROUP BY p.id, p.name, je.entry_date
  HAVING SUM(jl.debit - jl.credit) <> 0;
$$;
