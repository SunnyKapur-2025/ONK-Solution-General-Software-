import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantUser } from '@/lib/active-tenant'

interface BankTransaction {
  date: string
  description: string
  debit: number
  credit: number
  balance: number
}

interface RequestBody {
  transactions: BankTransaction[]
  bankAccountId: string
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json()
    const { transactions, bankAccountId } = body

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'No transactions provided' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantId = tenantUser.tenant_id

    // Resolve the bank account ledger ID
    let bankLedgerId: string | null = null
    if (bankAccountId && bankAccountId !== 'default') {
      const { data: bankAcc } = await supabase
        .from('accounts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('id', bankAccountId)
        .single()
      if (bankAcc) bankLedgerId = bankAcc.id
    }

    if (!bankLedgerId) {
      // Fallback: use the first bank/current account
      const { data: bankAcc } = await supabase
        .from('accounts')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('name', '%bank%')
        .limit(1)
        .single()
      if (bankAcc) bankLedgerId = bankAcc.id
    }

    // Resolve suspense account — used for unidentified entries
    let suspenseId: string | null = null
    const { data: suspenseAcc } = await supabase
      .from('accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('name', '%suspense%')
      .limit(1)
      .single()
    if (suspenseAcc) suspenseId = suspenseAcc.id

    // Get sequence starting point
    const { count: existingCount } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('voucher_type', 'journal')

    let sequence = (existingCount ?? 0) + 1
    const createdEntries: string[] = []

    for (const tx of transactions) {
      // Parse date — attempt ISO, DD/MM/YYYY, and DD-MM-YYYY formats
      let parsedDate = tx.date
      if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(tx.date)) {
        const parts = tx.date.split(/[\/\-]/)
        parsedDate = `${parts[2]}-${parts[1]}-${parts[0]}`
      }

      const entryNumber = `BNK-${String(sequence).padStart(6, '0')}`
      sequence++

      // Determine direction:
      // Credit in bank statement = money received → Debit Bank A/c, Credit Suspense
      // Debit in bank statement  = money sent    → Debit Suspense, Credit Bank A/c
      const isReceipt = tx.credit > 0
      const amount = isReceipt ? tx.credit : tx.debit

      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          tenant_id: tenantId,
          entry_number: entryNumber,
          entry_date: parsedDate,
          narration: tx.description || 'Bank statement import',
          voucher_type: 'journal',
          status: 'draft',
          created_by: user.id,
        })
        .select('id')
        .single()

      if (entryError || !entry) continue

      // Build journal lines only if we have account IDs
      const lines = []

      if (bankLedgerId && suspenseId) {
        if (isReceipt) {
          // Debit Bank, Credit Suspense
          lines.push(
            { journal_entry_id: entry.id, account_id: bankLedgerId, debit: amount, credit: 0, narration: tx.description },
            { journal_entry_id: entry.id, account_id: suspenseId, debit: 0, credit: amount, narration: tx.description },
          )
        } else {
          // Debit Suspense, Credit Bank
          lines.push(
            { journal_entry_id: entry.id, account_id: suspenseId, debit: amount, credit: 0, narration: tx.description },
            { journal_entry_id: entry.id, account_id: bankLedgerId, debit: 0, credit: amount, narration: tx.description },
          )
        }

        if (lines.length > 0) {
          await supabase.from('journal_lines').insert(lines)
        }
      }

      createdEntries.push(entry.id)
    }

    return NextResponse.json({
      success: true,
      count: createdEntries.length,
      message: `${createdEntries.length} draft journal entries created from ${transactions.length} bank transactions.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[bank-recon/import]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
