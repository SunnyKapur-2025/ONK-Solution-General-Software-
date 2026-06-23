import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildJournalLines, isBalanced } from '@/lib/accounting/auto-journal'
import { getActiveTenantUser } from '@/lib/active-tenant'

const SYSTEM_CODES: Record<string, string> = {
  CREDITORS: '2100',
  CASH:      '1610',
}

async function resolveAccountId(
  supabase: ReturnType<Awaited<ReturnType<typeof createClient>>['from']> extends never ? never : Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  idOrCode: string
): Promise<string> {
  if (idOrCode.match(/^[0-9a-f-]{36}$/i)) return idOrCode
  const code = SYSTEM_CODES[idOrCode] || idOrCode
  const { data } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('code', code)
    .single()
  return data?.id || idOrCode
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { date, vendorId, vendorName, amount, paidFrom, narration, reference } = body

    if (!date || !amount || !paidFrom) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const tenantId = tenantUser.tenant_id

    const creditorsAccountId = await resolveAccountId(supabase, tenantId, 'CREDITORS')
    const bankAccountId = paidFrom === 'cash'
      ? await resolveAccountId(supabase, tenantId, 'CASH')
      : paidFrom

    const journalLines = buildJournalLines({
      type: 'payment',
      date,
      narration: narration || vendorName || 'Vendor payment',
      amount,
      partyAccountId: creditorsAccountId,
      ledgerAccountId: creditorsAccountId,
      settlementAccountId: bankAccountId,
    })

    // Override party line to use creditors account (not vendor id as account)
    const resolvedLines = journalLines.map((l) => ({
      ...l,
      partyId: l.accountId === creditorsAccountId ? vendorId || null : null,
    }))

    if (!isBalanced(resolvedLines)) {
      return NextResponse.json({ error: 'Journal entry is not balanced' }, { status: 500 })
    }

    const { count } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('voucher_type', 'payment')

    const entryNumber = `PMT-${String((count || 0) + 1).padStart(5, '0')}`

    const { data: entry, error: entryErr } = await supabase
      .from('journal_entries')
      .insert({
        tenant_id: tenantId,
        entry_number: entryNumber,
        entry_date: date,
        narration: narration || vendorName || 'Vendor payment',
        reference: reference || null,
        voucher_type: 'payment',
        status: 'posted',
        created_by: user.id,
      })
      .select()
      .single()

    if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 500 })

    const lineRows = resolvedLines.map((l) => ({
      tenant_id: tenantId,
      journal_entry_id: entry.id,
      account_id: l.accountId,
      debit: l.debit,
      credit: l.credit,
      narration: l.narration || narration || 'Vendor payment',
      party_id: l.partyId || null,
    }))

    const { error: linesErr } = await supabase.from('journal_lines').insert(lineRows)
    if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 })

    return NextResponse.json(entry, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('Payment API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
