import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantUser } from '@/lib/active-tenant'

interface StatementLine {
  id: string
  date: string
  description: string
  debit: number
  credit: number
  balance: number
  matchStatus: 'matched' | 'suggested' | 'unmatched'
  matchedVoucherId?: string
  matchedVoucherNo?: string
  matchConfidence?: number
}

export async function POST(req: NextRequest) {
  try {
    const { lines } = await req.json() as { lines: StatementLine[] }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch posted vouchers for auto-matching
    const amounts = lines.map(l => l.credit > 0 ? l.credit : l.debit)
    const { data: vouchers } = await supabase
      .from('journal_entries')
      .select(`
        id, entry_number, entry_date, narration, voucher_type,
        journal_lines(debit, credit)
      `)
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('status', 'posted')

    if (!vouchers) return NextResponse.json({ lines })

    // Build voucher amount index
    const voucherAmounts = vouchers.map(v => {
      const vLines = v.journal_lines as Array<{ debit: number; credit: number }> || []
      const total = vLines.reduce((s, l) => s + Math.max(l.debit, l.credit), 0)
      return { id: v.id, no: v.entry_number, date: v.entry_date, amount: total, type: v.voucher_type }
    })

    // Auto-match by amount + date proximity
    const matched = lines.map(line => {
      const lineAmount = line.credit > 0 ? line.credit : line.debit
      const lineDate = new Date(line.date)

      const candidates = voucherAmounts.filter(v => {
        const vDate = new Date(v.date)
        const dayDiff = Math.abs((lineDate.getTime() - vDate.getTime()) / 86400000)
        const amountMatch = Math.abs(v.amount - lineAmount) < 1
        return amountMatch && dayDiff <= 5
      })

      if (candidates.length === 1) {
        const confidence = candidates[0].amount === lineAmount ? 95 : 80
        return {
          ...line,
          matchStatus: confidence > 90 ? 'matched' : 'suggested' as 'matched' | 'suggested',
          matchedVoucherId: candidates[0].id,
          matchedVoucherNo: candidates[0].no,
          matchConfidence: confidence,
        }
      }
      return { ...line, matchStatus: 'unmatched' as const }
    })

    return NextResponse.json({ lines: matched })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
