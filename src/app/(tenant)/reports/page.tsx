'use client'

import Link from 'next/link'

type ReportCard = {
  title: string
  description: string
  href: string
  icon: string
  color: string
}

const REPORTS: ReportCard[] = [
  {
    title: 'P&L Statement',
    description: 'Profit & Loss for any date range. See income, expenses, and net profit.',
    href: '/pnl',
    icon: 'TrendingUp',
    color: 'green',
  },
  {
    title: 'Balance Sheet',
    description: 'Assets vs Liabilities snapshot. Check the financial position of your business.',
    href: '/balance-sheet',
    icon: 'Scale',
    color: 'blue',
  },
  {
    title: 'Day Book',
    description: 'Chronological log of all journal entries. Daily transaction register.',
    href: '/day-book',
    icon: 'BookOpen',
    color: 'slate',
  },
  {
    title: 'Debtors Aging',
    description: 'Outstanding receivables grouped by age (0–30, 31–60, 60+ days).',
    href: '/debtors',
    icon: 'ArrowRight',
    color: 'orange',
  },
  {
    title: 'Creditors Aging',
    description: 'Outstanding payables grouped by age. Know who you owe and when.',
    href: '/creditors',
    icon: 'ArrowLeft',
    color: 'red',
  },
  {
    title: 'GST Summary',
    description: 'Input credit vs output tax. Month-wise GSTR-1 and GSTR-3B reconciliation.',
    href: '/gst',
    icon: 'Receipt',
    color: 'purple',
  },
  {
    title: 'Export to Tally / Busy',
    description: 'Export journal entries in XML format for Tally Prime or Busy Accounting.',
    href: '/export',
    icon: 'Download',
    color: 'teal',
  },
]

const COLOR_CLASSES: Record<string, { bg: string; border: string; icon: string; btn: string }> = {
  green:  { bg: 'bg-green-50',  border: 'border-green-100',  icon: 'bg-green-100 text-green-700',  btn: 'bg-green-600 hover:bg-green-500' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',   icon: 'bg-blue-100 text-blue-700',    btn: 'bg-blue-600 hover:bg-blue-500' },
  slate:  { bg: 'bg-slate-50',  border: 'border-slate-200',  icon: 'bg-slate-200 text-slate-700',  btn: 'bg-slate-700 hover:bg-slate-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-100', icon: 'bg-orange-100 text-orange-700',btn: 'bg-orange-600 hover:bg-orange-500' },
  red:    { bg: 'bg-red-50',    border: 'border-red-100',    icon: 'bg-red-100 text-red-700',      btn: 'bg-red-600 hover:bg-red-500' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'bg-purple-100 text-purple-700',btn: 'bg-purple-600 hover:bg-purple-500' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-100',   icon: 'bg-teal-100 text-teal-700',    btn: 'bg-teal-600 hover:bg-teal-500' },
}

const ICONS: Record<string, React.ReactNode> = {
  TrendingUp: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  Scale:      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l9-3 9 3M3 6v12l9 3 9-3V6" /></svg>,
  BookOpen:   <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  ArrowRight: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>,
  ArrowLeft:  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>,
  Receipt:    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>,
  Download:   <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
}

export default function ReportsPage() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">Financial reports and analytics for your business</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((report) => {
          const c = COLOR_CLASSES[report.color]
          return (
            <div
              key={report.title}
              className={`rounded-xl border ${c.border} ${c.bg} p-5 flex flex-col gap-3`}
            >
              <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center flex-shrink-0`}>
                {ICONS[report.icon]}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{report.title}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{report.description}</p>
              </div>
              <Link
                href={report.href}
                className={`${c.btn} text-white text-sm font-medium px-4 py-2 rounded-lg text-center transition-colors`}
              >
                Open Report
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
