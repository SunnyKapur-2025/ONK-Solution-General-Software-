import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('accountId')
    const partyId = searchParams.get('partyId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!accountId && !partyId) {
      return NextResponse.json({ error: 'accountId or partyId is required' }, { status: 400 })
    }
    if (!from || !to) {
      return NextResponse.json({ error: 'from and to date params are required' }, { status: 400 })
    }

    // Fetch account info
    const accountQuery = supabase
      .from('accounts')
      .select('id, name, opening_balance, opening_balance_type')
      .eq('tenant_id', tenantUser.tenant_id)

    if (accountId) accountQuery.eq('id', accountId)

    const { data: accountData, error: accountError } = await accountQuery.single()
    if (accountError || !accountData) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Fetch journal lines within date range
    let linesQuery = supabase
      .from('journal_lines')
      .select(`
        id,
        debit,
        credit,
        party_id,
        parties(name),
        journal_entries!inner(
          id,
          entry_number,
          entry_date,
          narration,
          tenant_id
        )
      `)
      .eq('journal_entries.tenant_id', tenantUser.tenant_id)
      .gte('journal_entries.entry_date', from)
      .lte('journal_entries.entry_date', to)
      .order('journal_entries(entry_date)', { ascending: true })

    if (accountId) {
      linesQuery = linesQuery.eq('account_id', accountId)
    }

    const { data: linesData, error: linesError } = await linesQuery

    if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 })

    const lines = (linesData || []).map((line: {
      debit: number | null
      credit: number | null
      parties: { name: string } | { name: string }[] | null
      journal_entries: {
        entry_number: string
        entry_date: string
        narration: string
      } | {
        entry_number: string
        entry_date: string
        narration: string
      }[]
    }) => {
      const entry = Array.isArray(line.journal_entries) ? line.journal_entries[0] : line.journal_entries
      const party = Array.isArray(line.parties) ? line.parties[0] : line.parties
      return {
        date: entry?.entry_date ?? '',
        entryNumber: entry?.entry_number ?? '',
        narration: entry?.narration ?? '',
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
        partyName: party?.name ?? '',
      }
    })

    return NextResponse.json({
      accountName: accountData.name,
      openingBalance: accountData.opening_balance ?? 0,
      openingBalanceType: accountData.opening_balance_type ?? 'Dr',
      lines,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
