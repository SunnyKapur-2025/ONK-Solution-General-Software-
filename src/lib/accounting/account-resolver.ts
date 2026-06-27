import type { createClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * System account codes used by auto-journal posting.
 * These codes must exist in the tenant's chart of accounts.
 */
export const SYSTEM_ACCOUNT_CODES = {
  CASH:              '1000',
  BANK:              '1100',
  DEBTORS:           '1200',
  CREDITORS:         '2000',
  INPUT_CGST:        '2110',
  INPUT_SGST:        '2111',
  INPUT_IGST:        '2112',
  OUTPUT_CGST:       '2200',
  OUTPUT_SGST:       '2201',
  OUTPUT_IGST:       '2202',
  SALARIES_PAYABLE:  '2300',
  SALES:             '4000',
  SERVICE_INCOME:    '4100',
  PURCHASES:         '5100',
  SALARY_EXPENSE:    '5200',
  RENT_EXPENSE:      '5300',
  DEPRECIATION:      '5400',
} as const

export type SystemAccountCode = keyof typeof SYSTEM_ACCOUNT_CODES

const UUID_REGEX = /^[0-9a-f-]{36}$/i

function codeFor(idOrCode: string): string {
  if (idOrCode in SYSTEM_ACCOUNT_CODES) {
    return SYSTEM_ACCOUNT_CODES[idOrCode as SystemAccountCode]
  }
  return idOrCode
}

/**
 * Resolve a single account by system-code key (e.g. 'CASH'), raw account code,
 * or UUID. Returns the account UUID. Throws if the code is not found in the
 * tenant's chart of accounts.
 */
export async function resolveAccountId(
  supabase: SupabaseClient,
  tenantId: string,
  idOrCode: string
): Promise<string> {
  if (UUID_REGEX.test(idOrCode)) return idOrCode
  const code = codeFor(idOrCode)
  const { data, error } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('code', code)
    .maybeSingle()
  if (error) {
    throw new Error(`Failed to resolve account "${code}": ${error.message}`)
  }
  if (!data) {
    throw new Error(`Account not found for code "${code}". Please create it in Settings > Chart of Accounts.`)
  }
  return data.id
}

/**
 * Resolve many accounts at once via a single `.in()` query. Accepts a mix of
 * system-code keys, raw codes, and UUIDs. Returns a record keyed by the input
 * value. Throws if any non-UUID code is not found.
 */
export async function resolveAccountIds(
  supabase: SupabaseClient,
  tenantId: string,
  idsOrCodes: string[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  const codeToInputs = new Map<string, string[]>()

  for (const input of idsOrCodes) {
    if (UUID_REGEX.test(input)) {
      result[input] = input
      continue
    }
    const code = codeFor(input)
    const inputs = codeToInputs.get(code) ?? []
    inputs.push(input)
    codeToInputs.set(code, inputs)
  }

  const codesToFetch = Array.from(codeToInputs.keys())
  if (codesToFetch.length === 0) return result

  const { data, error } = await supabase
    .from('accounts')
    .select('id, code')
    .eq('tenant_id', tenantId)
    .in('code', codesToFetch)

  if (error) {
    throw new Error(`Failed to resolve accounts: ${error.message}`)
  }

  const found = new Map<string, string>()
  for (const row of (data ?? []) as Array<{ id: string; code: string }>) {
    found.set(row.code, row.id)
  }

  for (const [code, inputs] of codeToInputs) {
    const id = found.get(code)
    if (!id) {
      throw new Error(`Account not found for code "${code}". Please create it in Settings > Chart of Accounts.`)
    }
    for (const input of inputs) result[input] = id
  }

  return result
}
