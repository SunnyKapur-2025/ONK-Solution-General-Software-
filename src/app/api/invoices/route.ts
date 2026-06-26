import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const tenantId = tenantUser.tenant_id

    // Get all sales journal entries for the tenant
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('id, entry_number, entry_date, narration, status, reference')
      .eq('tenant_id', tenantId)
      .eq('voucher_type', 'sales')
      .order('entry_date', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // For each entry, get the total debit (= invoice amount) from the debtors/cash line
    const { data: lines, error: linesErr } = await supabase
      .from('journal_lines')
      .select('journal_entry_id, debit, credit, accounts!inner(code, name)')
      .eq('tenant_id', tenantId)
      .in('journal_entry_id', (entries || []).map((e) => e.id))

    if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 })

    // Build a map: entry_id -> total debit (excluding GST lines)
    const INCOME_CODES = ['4000', '4100']
    const amountByEntry: Record<string, number> = {}
    const partyByEntry: Record<string, string> = {}

    for (const line of (lines || [])) {
      const account = Array.isArray(line.accounts) ? line.accounts[0] : line.accounts
      if (!account) continue
      // Sum debits for receivable/cash accounts (not GST, not income)
      if (!INCOME_CODES.includes(account.code) && line.debit > 0) {
        amountByEntry[line.journal_entry_id] = (amountByEntry[line.journal_entry_id] || 0) + line.debit
      }
    }

    const result = (entries || []).map((e) => ({
      id: e.id,
      invoiceNumber: e.entry_number,
      date: e.entry_date,
      customer: partyByEntry[e.id] || e.reference || e.narration?.split(' ')[0] || 'Customer',
      amount: amountByEntry[e.id] || 0,
      status: e.status === 'posted' ? 'Unpaid' : e.status,
      narration: e.narration,
    }))

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('Invoices API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
