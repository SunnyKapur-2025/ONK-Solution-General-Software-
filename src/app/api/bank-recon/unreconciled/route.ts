import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantUser } from '@/lib/active-tenant'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const tenantId = tenantUser.tenant_id

    const url = new URL(req.url)
    const bankAccountId = url.searchParams.get('bankAccountId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    let query = supabase
      .from('journal_entries')
      .select(`
        id, entry_number, entry_date, narration, voucher_type, status, reference,
        journal_lines(account_id, debit, credit)
      `)
      .eq('tenant_id', tenantId)
      .in('status', ['posted', 'draft'])
      .order('entry_date', { ascending: false })
      .limit(200)

    if (from) query = query.gte('entry_date', from)
    if (to) query = query.lte('entry_date', to)

    const { data: entries, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let filtered = entries || []
    if (bankAccountId) {
      filtered = filtered.filter(entry => {
        const lines = entry.journal_lines as Array<{ account_id: string; debit: number; credit: number }> | null
        return lines?.some(l => l.account_id === bankAccountId)
      })
    }

    const result = filtered.map(entry => {
      const lines = entry.journal_lines as Array<{ account_id: string; debit: number; credit: number }> | null
      const bankLine = bankAccountId
        ? lines?.find(l => l.account_id === bankAccountId)
        : null
      const totalDebit = lines?.reduce((s, l) => s + (l.debit || 0), 0) ?? 0
      const totalCredit = lines?.reduce((s, l) => s + (l.credit || 0), 0) ?? 0

      return {
        id: entry.id,
        entryNumber: entry.entry_number,
        date: entry.entry_date,
        narration: entry.narration,
        voucherType: entry.voucher_type,
        status: entry.status,
        reference: entry.reference,
        amount: bankLine ? Math.max(bankLine.debit, bankLine.credit) : Math.max(totalDebit, totalCredit),
        direction: bankLine
          ? (bankLine.debit > 0 ? 'debit' : 'credit')
          : (totalDebit >= totalCredit ? 'debit' : 'credit'),
      }
    })

    return NextResponse.json({ entries: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[bank-recon/unreconciled]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
