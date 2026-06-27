import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildJournalLines, isBalanced } from '@/lib/accounting/auto-journal'
import { resolveAccountId } from '@/lib/accounting/account-resolver'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { date, customerName, customerId, invoiceNumber,
      description, amount, gstRate, gstType, paidVia, paidNow, reference } = body

    if (!date || !description || !amount) {
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

    // Resolve account IDs
    const cgstAmount = gstRate > 0 && gstType === 'intra' ? Math.round((amount * gstRate / 2) / 100 * 100) / 100 : 0
    const sgstAmount = gstRate > 0 && gstType === 'intra' ? Math.round((amount * gstRate / 2) / 100 * 100) / 100 : 0
    const igstAmount = gstRate > 0 && gstType === 'inter' ? Math.round((amount * gstRate) / 100 * 100) / 100 : 0

    // Determine debit side: if paid now → bank/cash, else → debtors
    const debitAccountId = paidNow
      ? (paidVia === 'cash' ? await resolveAccountId(supabase, tenantId, 'CASH') : paidVia)
      : await resolveAccountId(supabase, tenantId, 'DEBTORS')

    const salesAccountId = await resolveAccountId(supabase, tenantId, 'SERVICE_INCOME')

    const journalLines = buildJournalLines({
      type: 'sale',
      date,
      narration: description,
      amount,
      cgst: cgstAmount,
      sgst: sgstAmount,
      igst: igstAmount,
      partyAccountId: customerId || undefined,
      ledgerAccountId: salesAccountId,
      settlementAccountId: debitAccountId,
    })

    // Replace system code placeholders with real account IDs
    const resolvedLines = await Promise.all(
      journalLines.map(async (line) => ({
        ...line,
        accountId: await resolveAccountId(supabase, tenantId, line.accountId),
      }))
    )

    if (!isBalanced(resolvedLines)) {
      return NextResponse.json({ error: 'Journal entry is not balanced' }, { status: 500 })
    }

    // Generate entry number
    const { count } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('voucher_type', 'sales')

    const entryNumber = invoiceNumber || `SALE-${String((count || 0) + 1).padStart(5, '0')}`

    // Insert journal entry
    const { data: entry, error: entryErr } = await supabase
      .from('journal_entries')
      .insert({
        tenant_id: tenantId,
        entry_number: entryNumber,
        entry_date: date,
        narration: description,
        reference: reference || null,
        voucher_type: 'sales',
        status: 'posted',
        created_by: user.id,
      })
      .select()
      .single()

    if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 500 })

    // Insert journal lines
    const lineRows = resolvedLines.map((l) => ({
      tenant_id: tenantId,
      journal_entry_id: entry.id,
      account_id: l.accountId,
      debit: l.debit,
      credit: l.credit,
      narration: l.narration || description,
      party_id: customerId || null,
    }))

    const { error: linesErr } = await supabase.from('journal_lines').insert(lineRows)
    if (linesErr) return NextResponse.json({ error: linesErr.message }, { status: 500 })

    return NextResponse.json(entry, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('Sale API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
