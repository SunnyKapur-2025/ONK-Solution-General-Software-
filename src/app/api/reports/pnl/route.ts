import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computePnL, computeBalanceSheet } from '@/lib/accounting/reports'
import { getActiveTenantUser } from '@/lib/active-tenant'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') || new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0]
    const to   = searchParams.get('to')   || new Date().toISOString().split('T')[0]
    const type = searchParams.get('type') || 'pnl' // 'pnl' | 'balance_sheet'

    // Optional previous period params
    const prevFrom = searchParams.get('prevFrom')
    const prevTo   = searchParams.get('prevTo')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
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
      const current = computePnL(balances || [], from, to)

      if (prevFrom && prevTo) {
        const { data: prevBalances, error: prevError } = await supabase.rpc('get_account_balances', {
          p_tenant_id: tenantId,
          p_from_date: prevFrom,
          p_to_date: prevTo,
        })
        if (prevError) return NextResponse.json({ error: prevError.message }, { status: 500 })
        const previous = computePnL(prevBalances || [], prevFrom, prevTo)
        return NextResponse.json({ current, previous })
      }

      return NextResponse.json({ current })
    }

    // Balance sheet: need cumulative balances (all time) + P&L for net profit
    const { data: allBalances } = await supabase.rpc('get_account_balances', {
      p_tenant_id: tenantId,
      p_from_date: '2000-01-01',
      p_to_date: to,
    })

    const pnl = computePnL(balances || [], from, to)
    const current = computeBalanceSheet(allBalances || [], pnl.netProfit, to)

    if (prevFrom && prevTo) {
      const { data: prevBalances, error: prevBsError } = await supabase.rpc('get_account_balances', {
        p_tenant_id: tenantId,
        p_from_date: prevFrom,
        p_to_date: prevTo,
      })
      if (prevBsError) return NextResponse.json({ error: prevBsError.message }, { status: 500 })

      const { data: prevAllBalances } = await supabase.rpc('get_account_balances', {
        p_tenant_id: tenantId,
        p_from_date: '2000-01-01',
        p_to_date: prevTo,
      })

      const prevPnl = computePnL(prevBalances || [], prevFrom, prevTo)
      const previous = computeBalanceSheet(prevAllBalances || [], prevPnl.netProfit, prevTo)
      return NextResponse.json({ current, previous })
    }

    return NextResponse.json({ current })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
