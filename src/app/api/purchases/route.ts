import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildJournalLines, isBalanced } from '@/lib/accounting/auto-journal'
import { resolveAccountId } from '@/lib/accounting/account-resolver'
import { rateLimit } from '@/lib/rate-limit'

const PURCHASE_CATEGORY_CODES: Record<string, string> = {
  goods:    '5200',
  services: '5000',
  rent:     '5300',
  salary:   '5100',
  travel:   '5700',
  office:   '5500',
  utility:  '5400',
  asset:    '1200',
  other:    '5920',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      date, vendorName, vendorId, billNumber,
      description, amount, gstRate, gstType, rcm, paidVia, paidNow,
      category, accountCode, reference,
    } = body

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

    const cgstAmount = gstRate > 0 && gstType === 'intra' && !rcm
      ? Math.round((amount * gstRate / 2) / 100 * 100) / 100
      : 0
    const sgstAmount = gstRate > 0 && gstType === 'intra' && !rcm
      ? Math.round((amount * gstRate / 2) / 100 * 100) / 100
      : 0
    const igstAmount = gstRate > 0 && gstType === 'inter' && !rcm
      ? Math.round((amount * gstRate) / 100 * 100) / 100
      : 0

    // Resolve purchase/expense account
    const expenseCode = accountCode || PURCHASE_CATEGORY_CODES[category] || '5920'
    const expenseAccountId = await resolveAccountId(supabase, tenantId, expenseCode)

    // Credit side: bank/cash if paid now, else creditors
    const creditAccountId = paidNow
      ? (paidVia === 'cash'
          ? await resolveAccountId(supabase, tenantId, 'CASH')
          : paidVia)
      : await resolveAccountId(supabase, tenantId, 'CREDITORS')

    const journalLines = buildJournalLines({
      type: 'purchase',
      date,
      narration: description || vendorName || category,
      amount,
      cgst: cgstAmount,
      sgst: sgstAmount,
      igst: igstAmount,
      partyAccountId: vendorId || undefined,
      ledgerAccountId: expenseAccountId,
      settlementAccountId: creditAccountId,
    })

    const resolvedLines = await Promise.all(
      journalLines.map(async (line) => ({
        ...line,
        accountId: await resolveAccountId(supabase, tenantId, line.accountId),
      }))
    )

    if (!isBalanced(resolvedLines)) {
      return NextResponse.json({ error: 'Journal entry is not balanced' }, { status: 500 })
    }

    const { count } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('voucher_type', 'purchase')

    const entryNumber = billNumber || `PUR-${String((count || 0) + 1).padStart(5, '0')}`

    const { data: entry, error: entryErr } = await supabase
      .from('journal_entries')
      .insert({
        tenant_id: tenantId,
        entry_number: entryNumber,
        entry_date: date,
        narration: description || vendorName || category,
        reference: reference || billNumber || null,
        voucher_type: 'purchase',
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
      narration: l.narration || description || category,
      party_id: vendorId || null,
    }))

    const { error: linesErr } = await supabase.from('journal_lines').insert(lineRows)
    if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 })

    return NextResponse.json(entry, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('Purchase API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
