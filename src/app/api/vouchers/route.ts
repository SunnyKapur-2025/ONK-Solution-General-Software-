import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEntryNumber } from '@/lib/utils'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { date, narration, lines, voucherType } = body as {
      date: string
      narration: string
      voucherType: string
      lines: Array<{ accountId: string; accountName: string; debit: number; credit: number }>
    }

    if (!lines || lines.length < 2)
      return NextResponse.json({ error: 'At least 2 lines required' }, { status: 400 })

    const totalDebit  = lines.reduce((s, l) => s + (l.debit  || 0), 0)
    const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0)
    if (Math.abs(totalDebit - totalCredit) > 0.01)
      return NextResponse.json({ error: 'Entry is not balanced (debit ≠ credit)' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = rateLimit(user.id, 30, 60000)
    if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id, name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Use timestamp as sequence to avoid DB roundtrip
    const entryNumber = generateEntryNumber((voucherType || 'JNL').toUpperCase().slice(0, 3), Date.now() % 1000000)

    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        tenant_id:    tenantUser.tenant_id,
        entry_number: entryNumber,
        entry_date:   date,
        voucher_type: voucherType || 'journal',
        narration,
        status:       'posted',
        created_by:   tenantUser.name,
      })
      .select('id')
      .single()

    if (entryError) return NextResponse.json({ error: entryError.message }, { status: 500 })

    const journalLines = lines.map(l => ({
      journal_entry_id: entry.id,
      account_id:       l.accountId,
      debit:            l.debit  || 0,
      credit:           l.credit || 0,
      narration,
    }))

    const { error: linesError } = await supabase.from('journal_lines').insert(journalLines)
    if (linesError) return NextResponse.json({ error: linesError.message }, { status: 500 })

    return NextResponse.json({ id: entry.id, entryNumber })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
