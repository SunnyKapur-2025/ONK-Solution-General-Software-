import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id, name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tid = tenantUser.tenant_id

    // Account balances via RPC
    const { data: balances } = await supabase
      .rpc('get_account_balances', { p_tenant_id: tid })

    const bal = (balances || []) as Array<{
      account_id: string; account_name: string; account_type: string;
      account_group: string; balance: number
    }>

    const sum = (group: string) => bal.filter(b => b.account_group === group).reduce((s, b) => s + b.balance, 0)
    const sumType = (type: string) => bal.filter(b => b.account_type === type).reduce((s, b) => s + b.balance, 0)

    const cashAndBank = sum('Cash & Cash Equivalents') + sum('Bank Accounts')
    const receivables = sumType('receivable')
    const payables    = sumType('payable')
    const gstLiability = sum('GST Payable')

    // Overdue receivables (invoices > 30 days)
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: overdueEntries } = await supabase
      .from('journal_entries')
      .select('id, journal_lines(debit, credit)')
      .eq('tenant_id', tid)
      .eq('voucher_type', 'sales')
      .eq('status', 'posted')
      .lt('entry_date', thirtyDaysAgo.toISOString().split('T')[0])

    const receivablesOverdue = (overdueEntries || []).reduce((s, e) => {
      const lines = e.journal_lines as Array<{ debit: number; credit: number }> || []
      return s + lines.reduce((ls, l) => ls + Math.max(l.debit, l.credit), 0)
    }, 0)

    // Sales this month and last month
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

    const { data: salesThisMonthData } = await supabase
      .from('journal_entries')
      .select('journal_lines(credit)')
      .eq('tenant_id', tid).eq('voucher_type', 'sales').eq('status', 'posted')
      .gte('entry_date', thisMonthStart)
    const { data: salesLastMonthData } = await supabase
      .from('journal_entries')
      .select('journal_lines(credit)')
      .eq('tenant_id', tid).eq('voucher_type', 'sales').eq('status', 'posted')
      .gte('entry_date', lastMonthStart).lte('entry_date', lastMonthEnd)

    const sumSales = (data: typeof salesThisMonthData) =>
      (data || []).reduce((s, e) => {
        const lines = e.journal_lines as Array<{ credit: number }> || []
        return s + lines.reduce((ls, l) => ls + (l.credit || 0), 0)
      }, 0)

    const salesThisMonth = sumSales(salesThisMonthData)
    const salesLastMonth = sumSales(salesLastMonthData)

    // Monthly sales last 12 months
    const monthlySales: { month: string; amount: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mStart = d.toISOString().split('T')[0]
      const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
      const { data: mData } = await supabase
        .from('journal_entries')
        .select('journal_lines(credit)')
        .eq('tenant_id', tid).eq('voucher_type', 'sales').eq('status', 'posted')
        .gte('entry_date', mStart).lte('entry_date', mEnd)
      monthlySales.push({
        month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        amount: sumSales(mData),
      })
    }

    // TDS — calculate days until 7th of next month
    const tdsDeadline = new Date(now.getFullYear(), now.getMonth() + 1, 7)
    const tdsDeadlineDays = Math.ceil((tdsDeadline.getTime() - now.getTime()) / 86400000)
    const tdsToPay = sum('TDS Payable')

    // Top debtors via party outstanding
    const { data: partyData } = await supabase
      .rpc('get_party_outstanding', { p_tenant_id: tid })
    const topDebtors = ((partyData || []) as Array<{ party_name: string; outstanding: number }>)
      .filter(p => p.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 5)
      .map(p => ({ name: p.party_name, amount: p.outstanding }))

    // Recent entries
    const { data: recentData } = await supabase
      .from('journal_entries')
      .select('id, entry_date, voucher_type, narration, journal_lines(debit, credit)')
      .eq('tenant_id', tid)
      .eq('status', 'posted')
      .order('created_at', { ascending: false })
      .limit(8)

    const recentEntries = (recentData || []).map(e => {
      const lines = e.journal_lines as Array<{ debit: number; credit: number }> || []
      const amount = lines.reduce((s, l) => s + Math.max(l.debit || 0, l.credit || 0), 0)
      return { id: e.id, date: e.entry_date, type: e.voucher_type, narration: e.narration, amount }
    })

    // Pending approvals (draft entries)
    const { count: pendingApprovals } = await supabase
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tid)
      .eq('status', 'draft')

    return NextResponse.json({
      cashAndBank,
      receivables,
      receivablesOverdue,
      payables,
      payablesDueThisWeek: 0,
      salesThisMonth,
      salesLastMonth,
      gstLiability,
      tdsToPay,
      tdsDeadlineDays,
      pendingApprovals: pendingApprovals || 0,
      gstMismatches: 0,
      recurringPending: 0,
      recentEntries,
      monthlySales,
      topDebtors,
      agingDonut: [],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
