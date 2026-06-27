import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildJournalLines, isBalanced } from '@/lib/accounting/auto-journal'
import { rateLimit } from '@/lib/rate-limit'

const SYSTEM_CODES: Record<string, string> = {
  CREDITORS: '2100',
  CASH:      '1610',
}

async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
    .maybeSingle()
  if (!data) throw new Error(`Account not found for code "${code}". Please create it in Settings > Chart of Accounts.`)
  return data.id
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { date, vendorId, partyId: partyIdFromBody, vendorName, amount, paidFrom, narration, reference } = body
    const partyId = partyIdFromBody || vendorId

    if (!date || !amount || !paidFrom) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = rateLimit(user.id, 30, 60000)
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const tenantId = tenantUser.tenant_id

    const creditorsAccountId = await resolveAccountId(supabase, tenantId, 'CREDITORS')
    const bankAccountId = paidFrom === 'cash'
      ? await resolveAccountId(supabase, tenantId, 'CASH')
      : paidFrom

    // Look up vendor-specific party account; fall back to generic creditors account
    let partyAccountId = creditorsAccountId
    if (partyId) {
      const { data: partyRow, error: partyErr } = await supabase
        .from('parties')
        .select('account_id')
        .eq('tenant_id', tenantId)
        .eq('id', partyId)
        .maybeSingle()
      if (partyErr) {
        console.error('Payment API: failed to load party', partyId, partyErr.message)
        return NextResponse.json({ error: `Failed to load party: ${partyErr.message}` }, { status: 500 })
      }
      if (partyRow?.account_id) partyAccountId = partyRow.account_id
    }

    const journalLines = buildJournalLines({
      type: 'payment',
      date,
      narration: narration || vendorName || 'Vendor payment',
      amount,
      partyAccountId,
      ledgerAccountId: partyAccountId,
      settlementAccountId: bankAccountId,
    })

    const resolvedLines = journalLines.map((l) => ({
      ...l,
      partyId: l.accountId === partyAccountId ? partyId || null : null,
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
