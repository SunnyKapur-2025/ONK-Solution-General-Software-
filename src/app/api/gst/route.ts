import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantUser } from '@/lib/active-tenant'

const GST_CODES: Record<string, string> = {
  '2330': 'outputCGST',
  '2331': 'outputSGST',
  '2332': 'outputIGST',
  '1650': 'inputCGST',
  '1651': 'inputSGST',
  '1652': 'inputIGST',
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const tenantId = tenantUser.tenant_id

    // Get GST account IDs
    const { data: accounts, error: accErr } = await supabase
      .from('accounts')
      .select('id, code')
      .eq('tenant_id', tenantId)
      .in('code', Object.keys(GST_CODES))

    if (accErr) return NextResponse.json({ error: accErr.message }, { status: 500 })
    if (!accounts || accounts.length === 0) return NextResponse.json([])

    const accountIdToCode: Record<string, string> = {}
    accounts.forEach((a) => { accountIdToCode[a.id] = a.code })

    // Get journal lines for GST accounts
    const { data: lines, error: linesErr } = await supabase
      .from('journal_lines')
      .select('account_id, debit, credit, journal_entries!inner(entry_date)')
      .eq('tenant_id', tenantId)
      .in('account_id', accounts.map((a) => a.id))

    if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 })

    // Group by month
    type MonthData = {
      month: string
      outputCGST: number; outputSGST: number; outputIGST: number
      inputCGST: number; inputSGST: number; inputIGST: number
      netPayable: number
    }
    const byMonth: Record<string, MonthData> = {}

    for (const line of (lines || [])) {
      const entry = Array.isArray(line.journal_entries) ? line.journal_entries[0] : line.journal_entries
      if (!entry?.entry_date) continue
      const month = entry.entry_date.substring(0, 7)
      if (!byMonth[month]) {
        byMonth[month] = { month, outputCGST: 0, outputSGST: 0, outputIGST: 0, inputCGST: 0, inputSGST: 0, inputIGST: 0, netPayable: 0 }
      }
      const code = accountIdToCode[line.account_id]
      const field = GST_CODES[code] as keyof MonthData
      if (!field) continue
      // Output GST: credit increases liability; Input GST: debit increases asset
      const isOutput = ['outputCGST', 'outputSGST', 'outputIGST'].includes(field)
      const val = isOutput ? (line.credit - line.debit) : (line.debit - line.credit)
      byMonth[month][field] = ((byMonth[month][field] as number) + val) as never
    }

    // Compute netPayable
    const result = Object.values(byMonth)
      .map((m) => ({
        ...m,
        netPayable: (m.outputCGST + m.outputSGST + m.outputIGST) - (m.inputCGST + m.inputSGST + m.inputIGST),
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('GST API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
