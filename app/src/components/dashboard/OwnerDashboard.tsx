'use client'

import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface KpiCard {
  label: string
  value: number
  subLabel?: string
  subValue?: number
  subColor?: string
  href?: string
  color: string
}

interface DashboardData {
  cashAndBank: number
  receivables: number
  receivablesOverdue: number
  payables: number
  payablesDueThisWeek: number
  salesThisMonth: number
  salesLastMonth: number
  gstLiability: number
  tdsToPay: number
  tdsDeadlineDays: number
  pendingApprovals: number
  gstMismatches: number
  recurringPending: number
  recentEntries: {
    id: string
    date: string
    type: string
    narration: string
    amount: number
  }[]
  monthlySales: { month: string; amount: number }[]
  topDebtors: { name: string; amount: number }[]
  agingDonut: { label: string; amount: number; color: string }[]
}

interface Props {
  data: DashboardData
  tenantName: string
  userName: string
}

function KpiCard({ label, value, subLabel, subValue, subColor, href, color }: KpiCard) {
  const content = (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color}`}>{formatCurrency(value)}</p>
      {subLabel && subValue !== undefined && (
        <p className={`text-xs mt-1 ${subColor || 'text-slate-500'}`}>
          {subLabel}: {formatCurrency(subValue)}
        </p>
      )}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

export default function OwnerDashboard({ data, tenantName, userName }: Props) {
  const salesGrowth = data.salesLastMonth > 0
    ? ((data.salesThisMonth - data.salesLastMonth) / data.salesLastMonth * 100).toFixed(1)
    : null

  return (
    <div className="max-w-7xl mx-auto py-6 px-6 space-y-6">

      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Good {getTimeOfDay()}, {userName.split(' ')[0]}</h1>
        <p className="text-slate-500 text-sm">{tenantName} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Action queue */}
      {(data.pendingApprovals > 0 || data.gstMismatches > 0 || data.recurringPending > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex flex-wrap gap-4">
          <p className="text-amber-800 font-semibold text-sm self-center">Action needed:</p>
          {data.pendingApprovals > 0 && (
            <Link href="/approvals" className="text-sm bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1 rounded-full font-medium">
              {data.pendingApprovals} voucher{data.pendingApprovals > 1 ? 's' : ''} awaiting approval
            </Link>
          )}
          {data.recurringPending > 0 && (
            <Link href="/recurring" className="text-sm bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1 rounded-full font-medium">
              {data.recurringPending} recurring entries to confirm
            </Link>
          )}
          {data.gstMismatches > 0 && (
            <Link href="/gst" className="text-sm bg-red-100 hover:bg-red-200 text-red-900 px-3 py-1 rounded-full font-medium">
              {data.gstMismatches} GST mismatches
            </Link>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Cash & Bank"
          value={data.cashAndBank}
          color="text-slate-900"
          href="/bank" />
        <KpiCard label="You will Receive"
          value={data.receivables}
          subLabel="Overdue"
          subValue={data.receivablesOverdue}
          subColor={data.receivablesOverdue > 0 ? 'text-red-600 font-semibold' : 'text-slate-500'}
          color="text-blue-700"
          href="/debtors" />
        <KpiCard label="You Owe"
          value={data.payables}
          subLabel="Due this week"
          subValue={data.payablesDueThisWeek}
          subColor={data.payablesDueThisWeek > 0 ? 'text-orange-600' : 'text-slate-500'}
          color="text-orange-700"
          href="/creditors" />
        <KpiCard label="Sales This Month"
          value={data.salesThisMonth}
          subLabel={salesGrowth ? `${parseFloat(salesGrowth) >= 0 ? '▲' : '▼'} vs last month` : undefined}
          subValue={data.salesLastMonth}
          subColor={salesGrowth && parseFloat(salesGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}
          color="text-green-700"
          href="/sales" />
        <KpiCard label="GST Payable"
          value={data.gstLiability}
          subLabel="This period estimate"
          color="text-purple-700"
          href="/gst" />
        <div className={`bg-white rounded-2xl border p-5 ${data.tdsDeadlineDays <= 3 ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">TDS to Deposit</p>
          <p className="text-2xl font-bold font-mono text-red-700">{formatCurrency(data.tdsToPay)}</p>
          <p className={`text-xs mt-1 font-semibold ${data.tdsDeadlineDays <= 3 ? 'text-red-600' : 'text-slate-500'}`}>
            {data.tdsDeadlineDays > 0 ? `Due in ${data.tdsDeadlineDays} days` : 'Due today!'}
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly sales bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Monthly Sales (Last 12 months)</h3>
          <div className="flex items-end gap-1 h-32">
            {data.monthlySales.map((m, i) => {
              const max = Math.max(...data.monthlySales.map(x => x.amount), 1)
              const h = Math.max((m.amount / max) * 100, 2)
              const isLast = i === data.monthlySales.length - 1
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative group">
                    <div
                      className={`w-full rounded-t transition-all ${isLast ? 'bg-blue-600' : 'bg-blue-200 hover:bg-blue-300'}`}
                      style={{ height: `${h}%`, minHeight: 4 }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none">
                      {formatCurrency(m.amount)}
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400 rotate-45 origin-left">{m.month}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top debtors */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Top 5 Who Owe You</h3>
            <Link href="/debtors" className="text-xs text-blue-600 hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {data.topDebtors.slice(0, 5).map((d) => {
              const max = Math.max(...data.topDebtors.map(x => x.amount), 1)
              const w = (d.amount / max) * 100
              return (
                <div key={d.name}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-slate-700 truncate max-w-[60%]">{d.name}</span>
                    <span className="font-mono font-semibold text-slate-800">{formatCurrency(d.amount)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full">
                    <div className="h-1.5 bg-blue-400 rounded-full" style={{ width: `${w}%` }} />
                  </div>
                </div>
              )
            })}
            {data.topDebtors.length === 0 && (
              <p className="text-slate-400 text-xs text-center py-4">No outstanding debtors</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity (Day Book in miniature) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Recent Activity</h3>
          <Link href="/day-book" className="text-xs text-blue-600 hover:underline">Full Day Book →</Link>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {data.recentEntries.slice(0, 8).map((e) => (
              <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
                <td className="px-5 py-2.5 text-slate-500 w-28 text-xs">
                  {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize mr-2
                    ${e.type === 'sales' ? 'bg-blue-100 text-blue-700' :
                      e.type === 'receipt' ? 'bg-green-100 text-green-700' :
                      e.type === 'purchase' ? 'bg-orange-100 text-orange-700' :
                      e.type === 'payment' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'}`}>
                    {e.type}
                  </span>
                  <span className="text-slate-700">{e.narration}</span>
                </td>
                <td className="px-5 py-2.5 text-right font-mono text-slate-800">{formatCurrency(e.amount)}</td>
              </tr>
            ))}
            {data.recentEntries.length === 0 && (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400 text-sm">No transactions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
