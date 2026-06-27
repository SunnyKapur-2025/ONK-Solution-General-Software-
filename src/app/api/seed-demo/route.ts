import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantUser } from '@/lib/active-tenant'
import { rateLimit } from '@/lib/rate-limit'

const DEMO_ENTRIES = [
  {
    voucher_type: 'sales',
    entry_date: '2026-04-01',
    narration: 'Sales invoice to Demo Client Pvt Ltd — consulting services',
    reference: 'Demo Client Pvt Ltd',
    lines: [
      { account_code: '1200', debit: 59000, credit: 0 },
      { account_code: '4000', debit: 0, credit: 50000 },
      { account_code: '2200', debit: 0, credit: 4500 },
      { account_code: '2201', debit: 0, credit: 4500 },
    ],
  },
  {
    voucher_type: 'purchase',
    entry_date: '2026-04-05',
    narration: 'Purchase — office supplies from Alpha Traders',
    reference: 'Alpha Traders',
    lines: [
      { account_code: '5100', debit: 8000, credit: 0 },
      { account_code: '2110', debit: 720, credit: 0 },
      { account_code: '2111', debit: 720, credit: 0 },
      { account_code: '2000', debit: 0, credit: 9440 },
    ],
  },
  {
    voucher_type: 'receipt',
    entry_date: '2026-04-10',
    narration: 'Payment received from Demo Client Pvt Ltd',
    reference: 'Demo Client Pvt Ltd',
    lines: [
      { account_code: '1000', debit: 59000, credit: 0 },
      { account_code: '1200', debit: 0, credit: 59000 },
    ],
  },
  {
    voucher_type: 'payment',
    entry_date: '2026-04-12',
    narration: 'Payment to Alpha Traders',
    reference: 'Alpha Traders',
    lines: [
      { account_code: '2000', debit: 9440, credit: 0 },
      { account_code: '1000', debit: 0, credit: 9440 },
    ],
  },
  {
    voucher_type: 'journal',
    entry_date: '2026-04-15',
    narration: 'Salary expense for April 2026',
    reference: 'Payroll',
    lines: [
      { account_code: '5200', debit: 75000, credit: 0 },
      { account_code: '2300', debit: 0, credit: 75000 },
    ],
  },
  {
    voucher_type: 'payment',
    entry_date: '2026-04-30',
    narration: 'Rent paid for April 2026',
    reference: 'Landlord',
    lines: [
      { account_code: '5300', debit: 20000, credit: 0 },
      { account_code: '1000', debit: 0, credit: 20000 },
    ],
  },
  {
    voucher_type: 'sales',
    entry_date: '2026-05-03',
    narration: 'Sales invoice to Beta Solutions — software development',
    reference: 'Beta Solutions',
    lines: [
      { account_code: '1200', debit: 118000, credit: 0 },
      { account_code: '4000', debit: 0, credit: 100000 },
      { account_code: '2200', debit: 0, credit: 9000 },
      { account_code: '2201', debit: 0, credit: 9000 },
    ],
  },
  {
    voucher_type: 'journal',
    entry_date: '2026-05-31',
    narration: 'Depreciation on computers and equipment — May 2026',
    reference: 'Depreciation',
    lines: [
      { account_code: '5400', debit: 5000, credit: 0 },
      { account_code: '1500', debit: 0, credit: 5000 },
    ],
  },
]

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = rateLimit(user.id, 30, 60000)
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (tenantUser.role !== 'owner') return NextResponse.json({ error: 'Only owners can seed demo data' }, { status: 403 })

    const tenantId = tenantUser.tenant_id

    // Fetch chart of accounts for this tenant
    const { data: accounts, error: accErr } = await supabase
      .from('accounts')
      .select('id, code')
      .eq('tenant_id', tenantId)

    if (accErr) return NextResponse.json({ error: accErr.message }, { status: 500 })

    const accountMap = new Map((accounts || []).map(a => [a.code, a.id]))

    let created = 0
    const errors: string[] = []

    for (const entry of DEMO_ENTRIES) {
      // Resolve accounts
      const lines = []
      let skipEntry = false
      for (const line of entry.lines) {
        const accountId = accountMap.get(line.account_code)
        if (!accountId) {
          // Skip lines for accounts that don't exist — don't fail the whole seed
          skipEntry = true
          break
        }
        lines.push({
          account_id: accountId,
          debit: line.debit,
          credit: line.credit,
          narration: entry.narration,
        })
      }
      if (skipEntry) continue

      const debitTotal = lines.reduce((s, l) => s + l.debit, 0)
      const creditTotal = lines.reduce((s, l) => s + l.credit, 0)
      if (Math.abs(debitTotal - creditTotal) > 0.01) {
        errors.push(`Skipped unbalanced entry: ${entry.narration}`)
        continue
      }

      const prefix = entry.voucher_type.toUpperCase().slice(0, 3)
      const entryNum = `${prefix}-DEMO-${String(created + 1).padStart(4, '0')}`

      const { data: je, error: jeErr } = await supabase
        .from('journal_entries')
        .insert({
          tenant_id: tenantId,
          entry_number: entryNum,
          entry_date: entry.entry_date,
          narration: entry.narration,
          reference: entry.reference,
          voucher_type: entry.voucher_type,
          status: 'posted',
          created_by: user.id,
        })
        .select('id')
        .single()

      if (jeErr || !je) {
        errors.push(`Failed: ${entry.narration} — ${jeErr?.message}`)
        continue
      }

      const lineRows = lines.map(l => ({ ...l, journal_entry_id: je.id, tenant_id: tenantId }))
      const { error: linesErr } = await supabase.from('journal_lines').insert(lineRows)
      if (linesErr) {
        errors.push(`Lines failed: ${entry.narration} — ${linesErr.message}`)
        await supabase.from('journal_entries').delete().eq('id', je.id)
        continue
      }

      created++
    }

    return NextResponse.json({ success: true, created, errors })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
