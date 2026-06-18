import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computePnL, computeBalanceSheet } from '@/lib/accounting/reports'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') || new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0]
    const to   = searchParams.get('to')   || new Date().toISOString().split('T')[0]
    const type = searchParams.get('type') || 'pnl' // 'pnl' | 'balance_sheet'

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

    const tenantId = tenantUser.tenant_id

    // Aggregate balances via SQL — sum debit/credit per account within date range
    const { data: balances, error } = await supabase.rpc('get_account_balances', {
      p_tenant_id: tenantId,
      p_from_date: from,
      p_to_date: to,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (type === 'pnl') {
      const report = computePnL(balances || [], from, to)
      return NextResponse.json(report)
    }

    // Balance sheet: need cumulative balances (all time) + P&L for net profit
    const { data: allBalances } = await supabase.rpc('get_account_balances', {
      p_tenant_id: tenantId,
      p_from_date: '2000-01-01',
      p_to_date: to,
    })

    const pnl = computePnL(balances || [], from, to)
    const report = computeBalanceSheet(allBalances || [], pnl.netProfit, to)
    return NextResponse.json(report)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
