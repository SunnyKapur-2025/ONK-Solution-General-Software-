import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildJournalLines, isBalanced } from '@/lib/accounting/auto-journal'

// System account code → DB id resolution happens via this lookup
const SYSTEM_CODES: Record<string, string> = {
  OUTPUT_CGST: '2330',
  OUTPUT_SGST: '2331',
  OUTPUT_IGST: '2332',
  INPUT_CGST:  '1650',
  INPUT_SGST:  '1651',
  INPUT_IGST:  '1652',
  CASH:        '1610',
  DEBTORS:     '1630',
  SALES:       '4000',
  SERVICE:     '4100',
}

async function resolveAccountId(
  supabase: ReturnType<Awaited<ReturnType<typeof createClient>>['from']> extends never ? never : Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  idOrCode: string
): Promise<string> {
  // If it looks like a UUID, return as-is
  if (idOrCode.match(/^[0-9a-f-]{36}$/i)) return idOrCode
  // If it's a system code alias, resolve to account code
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
    const { tenantId, date, customerName, customerId, invoiceNumber,
      description, amount, gstRate, gstType, paidVia, paidNow, reference } = body

    if (!tenantId || !date || !description || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Resolve account IDs
    const cgstAmount = gstRate > 0 && gstType === 'intra' ? Math.round((amount * gstRate / 2) / 100 * 100) / 100 : 0
    const sgstAmount = gstRate > 0 && gstType === 'intra' ? Math.round((amount * gstRate / 2) / 100 * 100) / 100 : 0
    const igstAmount = gstRate > 0 && gstType === 'inter' ? Math.round((amount * gstRate) / 100 * 100) / 100 : 0

    // Determine debit side: if paid now → bank/cash, else → debtors
    const debitAccountId = paidNow
      ? (paidVia === 'cash' ? await resolveAccountId(supabase, tenantId, 'CASH') : paidVia)
      : await resolveAccountId(supabase, tenantId, 'DEBTORS')

    const salesAccountId = await resolveAccountId(supabase, tenantId, 'SERVICE')

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
