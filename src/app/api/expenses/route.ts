import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildJournalLines, isBalanced } from '@/lib/accounting/auto-journal'
import { resolveAccountId } from '@/lib/accounting/account-resolver'
import { rateLimit } from '@/lib/rate-limit'

const EXPENSE_CATEGORY_CODES: Record<string, string> = {
  rent:      '5300',
  salary:    '5100',
  travel:    '5700',
  office:    '5500',
  utility:   '5400',
  marketing: '5600',
  repairs:   '5800',
  misc:      '5920',
  other:     '5920',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { date, category, description, amount, gstRate, paidVia, paidTo, reference } = body

    if (!date || !amount || !category) {
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
      .single()
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const tenantId = tenantUser.tenant_id

    const expenseCode = EXPENSE_CATEGORY_CODES[category] || '5920'
    const expenseAccountId = await resolveAccountId(supabase, tenantId, expenseCode)

    const creditAccountId = paidVia === 'cash'
      ? await resolveAccountId(supabase, tenantId, 'CASH')
      : paidVia

    const resolvedCreditId = await resolveAccountId(supabase, tenantId, creditAccountId)

    // Simple expense: DR expense, CR bank/cash (GST not separately tracked for direct expenses)
    const baseAmount = amount
    const taxTotal = gstRate > 0 ? Math.round((baseAmount * gstRate) / 100 * 100) / 100 : 0
    const totalAmount = baseAmount + taxTotal

    const journalLines = buildJournalLines({
      type: 'expense',
      date,
      narration: description || category,
      amount: totalAmount,
      ledgerAccountId: expenseAccountId,
      settlementAccountId: resolvedCreditId,
    })

    if (!isBalanced(journalLines)) {
      return NextResponse.json({ error: 'Journal entry is not balanced' }, { status: 500 })
    }

    const { count } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('voucher_type', 'journal')

    const entryNumber = `EXP-${String((count || 0) + 1).padStart(5, '0')}`

    const { data: entry, error: entryErr } = await supabase
      .from('journal_entries')
      .insert({
        tenant_id: tenantId,
        entry_number: entryNumber,
        entry_date: date,
        narration: description || category,
        reference: reference || null,
        voucher_type: 'journal',
        status: 'posted',
        created_by: user.id,
      })
      .select()
      .single()

    if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 500 })

    const lineRows = journalLines.map((l) => ({
      tenant_id: tenantId,
      journal_entry_id: entry.id,
      account_id: l.accountId,
      debit: l.debit,
      credit: l.credit,
      narration: l.narration || description || category,
      party_id: null,
    }))

    const { error: linesErr } = await supabase.from('journal_lines').insert(lineRows)
    if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 })

    return NextResponse.json(entry, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('Expense API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
