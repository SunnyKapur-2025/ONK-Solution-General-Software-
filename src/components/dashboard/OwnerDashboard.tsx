'use client'

import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

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
  gstMismatches?: number
  recurringPending?: number
  recentEntries: {
    id: string
    date: string
    type: string
    narration: string
    amount: number
  }[]
  monthlySales: { month: string; amount: number }[]
  topDebtors: { name: string; amount: number }[]
  agingDonut?: { label: string; amount: number; color: string }[]
}

interface Props {
  data: DashboardData
  tenantName: string
  userName: string
}

/* ------------------------------------------------------------------ */
/*  Icon components (inline SVG, no external deps)                    */
/* ------------------------------------------------------------------ */

function BankIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21" />
    </svg>
  )
}

function ReceivableIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  )
}

function PayableIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ProfitIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  )
}

function TypeIcon({ type }: { type: string }) {
  const base = 'w-4 h-4'
  switch (type) {
    case 'sales':
      return (
        <svg className={base} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22" />
        </svg>
      )
    case 'receipt':
      return (
        <svg className={base} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
        </svg>
      )
    case 'purchase':
      return (
        <svg className={base} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      )
    case 'payment':
      return (
        <svg className={base} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
        </svg>
      )
    default:
      return (
        <svg className={base} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function getDebtorBarColor(index: number): string {
  const colors = ['bg-red-500', 'bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-slate-400']
  return colors[index] || 'bg-slate-400'
}

function getDebtorTextColor(index: number): string {
  const colors = ['text-red-700', 'text-red-600', 'text-orange-600', 'text-amber-600', 'text-slate-600']
  return colors[index] || 'text-slate-600'
}

/* ------------------------------------------------------------------ */
/*  Quick Action Button                                               */
/* ------------------------------------------------------------------ */

function QuickAction({ label, href, icon }: { label: string; href: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all whitespace-nowrap"
    >
      {icon}
      {label}
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                    */
/* ------------------------------------------------------------------ */

export default function OwnerDashboard({ data, tenantName, userName }: Props) {
  const profitChange = data.salesLastMonth > 0
    ? ((data.salesThisMonth - data.salesLastMonth) / data.salesLastMonth * 100)
    : null

  const maxSales = Math.max(...data.monthlySales.map(m => m.amount), 1)
  const last6Months = data.monthlySales.slice(-6)

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">

      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Good {getTimeOfDay()}, {userName.split(' ')[0]}
        </h1>
        <p className="text-slate-500 text-sm">
          {tenantName} &middot; {new Date().toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      {/* ============================================================ */}
      {/*  1. TOP KPI CARDS — 4 in a row                               */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Cash & Bank */}
        <Link href="/bank" className="block">
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600"><BankIcon /></span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cash &amp; Bank</span>
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(data.cashAndBank)}</p>
          </div>
        </Link>

        {/* Receivables */}
        <Link href="/debtors" className="block">
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600"><ReceivableIcon /></span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Receivables</span>
            </div>
            <p className="text-2xl font-bold font-mono text-green-700">{formatCurrency(data.receivables)}</p>
            {data.receivablesOverdue > 0 && (
              <p className="text-xs mt-1 text-red-600 font-semibold">
                Overdue: {formatCurrency(data.receivablesOverdue)}
              </p>
            )}
          </div>
        </Link>

        {/* Payables */}
        <Link href="/creditors" className="block">
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-600"><PayableIcon /></span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payables</span>
            </div>
            <p className="text-2xl font-bold font-mono text-orange-700">{formatCurrency(data.payables)}</p>
            {data.payablesDueThisWeek > 0 && (
              <p className="text-xs mt-1 text-orange-600">
                Due this week: {formatCurrency(data.payablesDueThisWeek)}
              </p>
            )}
          </div>
        </Link>

        {/* Net Profit This Month */}
        <Link href="/reports" className="block">
          <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className={data.salesThisMonth >= 0 ? 'text-green-600' : 'text-red-600'}><ProfitIcon /></span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Profit (Month)</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${data.salesThisMonth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(data.salesThisMonth)}
            </p>
            {profitChange !== null && (
              <p className={`text-xs mt-1 font-semibold ${profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitChange >= 0 ? '▲' : '▼'} {Math.abs(profitChange).toFixed(1)}% vs last month
              </p>
            )}
          </div>
        </Link>
      </div>

      {/* ============================================================ */}
      {/*  2. QUICK ACTIONS BAR                                        */}
      {/* ============================================================ */}
      <div className="flex flex-wrap gap-3">
        <QuickAction
          label="Create Invoice"
          href="/invoices"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
        />
        <QuickAction
          label="Record Expense"
          href="/expenses"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          }
        />
        <QuickAction
          label="Record Payment"
          href="/payments"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <QuickAction
          label="New Voucher"
          href="/voucher"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
          }
        />
        <QuickAction
          label="Export to Tally"
          href="/reports"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          }
        />
      </div>

      {/* ============================================================ */}
      {/*  3. TWO-COLUMN LAYOUT                                        */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ---------------------------------------------------------- */}
        {/*  LEFT COLUMN                                                */}
        {/* ---------------------------------------------------------- */}
        <div className="space-y-6">

          {/* Monthly Sales Chart — pure CSS bars, last 6 months */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Monthly Sales</h3>
            <div className="flex items-end gap-3 h-40">
              {last6Months.map((m, i) => {
                const h = Math.max((m.amount / maxSales) * 100, 3)
                const isLast = i === last6Months.length - 1
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full relative group flex flex-col justify-end" style={{ height: '100%' }}>
                      <div
                        className={`w-full rounded-t-md transition-all ${isLast ? 'bg-blue-600' : 'bg-blue-300 hover:bg-blue-400'}`}
                        style={{ height: `${h}%`, minHeight: 4 }}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        {formatCurrency(m.amount)}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">{m.month}</span>
                  </div>
                )
              })}
            </div>
            {last6Months.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-8">No sales data yet</p>
            )}
          </div>

          {/* Top Debtors — color-coded by age/rank */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Top Debtors</h3>
              <Link href="/debtors" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {data.topDebtors.slice(0, 5).map((d, idx) => {
                const max = Math.max(...data.topDebtors.map(x => x.amount), 1)
                const w = (d.amount / max) * 100
                return (
                  <div key={d.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`truncate max-w-[60%] font-medium ${getDebtorTextColor(idx)}`}>{d.name}</span>
                      <span className="font-mono font-semibold text-slate-800">{formatCurrency(d.amount)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${getDebtorBarColor(idx)}`}
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {data.topDebtors.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-6">No outstanding debtors</p>
              )}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        {/*  RIGHT COLUMN                                               */}
        {/* ---------------------------------------------------------- */}
        <div className="space-y-6">

          {/* Recent Transactions — last 8 with type icon */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Recent Transactions</h3>
              <Link href="/day-book" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {data.recentEntries.slice(0, 8).map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    ${e.type === 'sales' ? 'bg-blue-100 text-blue-600' :
                      e.type === 'receipt' ? 'bg-green-100 text-green-600' :
                      e.type === 'purchase' ? 'bg-orange-100 text-orange-600' :
                      e.type === 'payment' ? 'bg-red-100 text-red-600' :
                      'bg-slate-100 text-slate-500'}`}
                  >
                    <TypeIcon type={e.type} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{e.narration}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      <span className="mx-1">&middot;</span>
                      <span className="capitalize">{e.type}</span>
                    </p>
                  </div>
                  <span className={`font-mono text-sm font-semibold flex-shrink-0 ${
                    e.type === 'receipt' || e.type === 'sales' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {e.type === 'receipt' || e.type === 'sales' ? '+' : '-'}{formatCurrency(e.amount)}
                  </span>
                </div>
              ))}
              {data.recentEntries.length === 0 && (
                <div className="px-5 py-10 text-center text-slate-400 text-sm">No transactions yet</div>
              )}
            </div>
          </div>

          {/* Compliance Alerts — GST filing, TDS deadline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Compliance Alerts</h3>
            <div className="space-y-3">

              {/* GST Filing Status */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l3-3m0 0l3 3m-3-3v8.25M3.75 6.75h16.5" />
                  </svg>
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-900">GST Liability</p>
                  <p className="text-xs text-purple-700 mt-0.5">
                    Estimated this period: <span className="font-semibold font-mono">{formatCurrency(data.gstLiability)}</span>
                  </p>
                </div>
                <Link href="/gst" className="text-xs text-purple-600 hover:underline self-center">Review</Link>
              </div>

              {/* TDS Deadline with countdown */}
              <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                data.tdsDeadlineDays <= 3
                  ? 'bg-red-50 border-red-200'
                  : data.tdsDeadlineDays <= 7
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  data.tdsDeadlineDays <= 3 ? 'bg-red-100' : data.tdsDeadlineDays <= 7 ? 'bg-amber-100' : 'bg-slate-100'
                }`}>
                  <svg className={`w-4 h-4 ${
                    data.tdsDeadlineDays <= 3 ? 'text-red-600' : data.tdsDeadlineDays <= 7 ? 'text-amber-600' : 'text-slate-500'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    data.tdsDeadlineDays <= 3 ? 'text-red-900' : 'text-slate-900'
                  }`}>TDS Deposit</p>
                  <p className="text-xs mt-0.5">
                    <span className={`font-semibold font-mono ${
                      data.tdsDeadlineDays <= 3 ? 'text-red-700' : 'text-slate-700'
                    }`}>{formatCurrency(data.tdsToPay)}</span>
                    <span className={`ml-2 ${
                      data.tdsDeadlineDays <= 3 ? 'text-red-600 font-semibold' : 'text-slate-500'
                    }`}>
                      {data.tdsDeadlineDays > 0
                        ? `Due in ${data.tdsDeadlineDays} day${data.tdsDeadlineDays !== 1 ? 's' : ''}`
                        : 'Due today!'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Pending Approvals */}
              {data.pendingApprovals > 0 && (
                <Link href="/approvals" className="block">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900">Pending Approvals</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {data.pendingApprovals} voucher{data.pendingApprovals !== 1 ? 's' : ''} awaiting review
                      </p>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
