'use client'

import { useState } from 'react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportCard = {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  color: keyof typeof COLOR_CLASSES
}

type ExportType = 'tally' | 'busy' | 'daybook'

type ExportButton = {
  label: string
  type: ExportType
  filename: string
  icon: React.ReactNode
  description: string
}

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const COLOR_CLASSES = {
  green:  { bg: 'bg-green-50',  border: 'border-green-100',  icon: 'bg-green-100 text-green-700',   btn: 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-500' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',   icon: 'bg-blue-100 text-blue-700',     btn: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500' },
  slate:  { bg: 'bg-slate-50',  border: 'border-slate-200',  icon: 'bg-slate-200 text-slate-700',   btn: 'bg-slate-700 hover:bg-slate-800 focus-visible:ring-slate-500' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-100', icon: 'bg-orange-100 text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-500' },
  red:    { bg: 'bg-red-50',    border: 'border-red-100',    icon: 'bg-red-100 text-red-700',       btn: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'bg-purple-100 text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-500' },
} as const

// ---------------------------------------------------------------------------
// SVG icons
// ---------------------------------------------------------------------------

const IconTrendingUp = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const IconScale = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707M18.364 18.364l.707.707M3 12h1m16 0h1M4.22 19.778l.707-.707M18.364 5.636l.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 17H4a1 1 0 01-1-1v-1a5 5 0 015-5h8a5 5 0 015 5v1a1 1 0 01-1 1h-2" />
  </svg>
)

const IconBookOpen = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

const IconDebtors = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a5 5 0 00-10 0v2M5 9h14l1 12H4L5 9z" />
  </svg>
)

const IconCreditors = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
)

const IconReceipt = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
  </svg>
)

const IconDownload = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)

const IconSpinner = (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
)

const IconCheck = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const IconTally = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h6" />
  </svg>
)

const IconCSV = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const REPORTS: ReportCard[] = [
  {
    title: 'P&L Statement',
    description: 'Profit & Loss for any date range. View income, expenses, and net profit broken down by category.',
    href: '/pnl',
    icon: IconTrendingUp,
    color: 'green',
  },
  {
    title: 'Balance Sheet',
    description: 'Assets vs. liabilities snapshot. Assess the complete financial position of your business at any point in time.',
    href: '/balance-sheet',
    icon: IconScale,
    color: 'blue',
  },
  {
    title: 'Day Book',
    description: 'Chronological log of all journal entries. A complete daily transaction register with narrations.',
    href: '/day-book',
    icon: IconBookOpen,
    color: 'slate',
  },
  {
    title: 'Debtors Aging',
    description: 'Outstanding receivables grouped by age: 0–30, 31–60, and 60+ days. Identify overdue accounts instantly.',
    href: '/debtors',
    icon: IconDebtors,
    color: 'orange',
  },
  {
    title: 'Creditors Aging',
    description: 'Outstanding payables grouped by age. Know exactly who you owe, how much, and when payment is due.',
    href: '/creditors',
    icon: IconCreditors,
    color: 'red',
  },
  {
    title: 'GST Summary',
    description: 'Input credit vs. output tax reconciliation. Month-wise GSTR-1 and GSTR-3B data at a glance.',
    href: '/gst',
    icon: IconReceipt,
    color: 'purple',
  },
]

const EXPORT_BUTTONS: ExportButton[] = [
  {
    label: 'Export Tally XML',
    type: 'tally',
    filename: 'export-tally.xml',
    icon: IconTally,
    description: 'Download ledger data in Tally-compatible XML format for direct import.',
  },
  {
    label: 'Export Busy CSV',
    type: 'busy',
    filename: 'export-busy.csv',
    icon: IconCSV,
    description: 'Download data as a Busy-formatted CSV file for accounting software import.',
  },
  {
    label: 'Export Day Book CSV',
    type: 'daybook',
    filename: 'export-daybook.csv',
    icon: IconCSV,
    description: 'Download the complete day book as a CSV for spreadsheet analysis.',
  },
]

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

async function triggerExport(type: ExportType, filename: string): Promise<void> {
  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`Export failed (${res.status}): ${text}`)
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ReportCardItem({ report }: { report: ReportCard }) {
  const c = COLOR_CLASSES[report.color]
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5 flex flex-col gap-4 transition-shadow hover:shadow-md`}>
      <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center flex-shrink-0`}>
        {report.icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-slate-800 text-sm">{report.title}</p>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{report.description}</p>
      </div>
      <Link
        href={report.href}
        className={`${c.btn} text-white text-sm font-medium px-4 py-2 rounded-lg text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
      >
        Open Report
      </Link>
    </div>
  )
}

type ExportState = 'idle' | 'loading' | 'success' | 'error'

function ExportButtonItem({ btn }: { btn: ExportButton }) {
  const [state, setState] = useState<ExportState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleClick() {
    if (state === 'loading') return
    setState('loading')
    setErrorMsg(null)
    try {
      await triggerExport(btn.type, btn.filename)
      setState('success')
      setTimeout(() => setState('idle'), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed. Please try again.'
      setErrorMsg(message)
      setState('error')
      setTimeout(() => setState('idle'), 5000)
    }
  }

  const isLoading = state === 'loading'
  const isSuccess = state === 'success'
  const isError = state === 'error'

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
          {btn.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{btn.label}</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{btn.description}</p>
        </div>
      </div>

      {isError && errorMsg && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      <button
        onClick={handleClick}
        disabled={isLoading}
        aria-busy={isLoading}
        className={`
          flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          disabled:cursor-not-allowed
          ${isSuccess
            ? 'bg-green-600 hover:bg-green-700 text-white focus-visible:ring-green-500'
            : isError
            ? 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500'
            : 'bg-slate-800 hover:bg-slate-900 text-white focus-visible:ring-slate-500 disabled:bg-slate-400'
          }
        `}
      >
        {isLoading ? (
          <>{IconSpinner} Preparing…</>
        ) : isSuccess ? (
          <>{IconCheck} Downloaded</>
        ) : isError ? (
          <>Retry Download</>
        ) : (
          <>{IconDownload} Download</>
        )}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  return (
    <div className="max-w-5xl mx-auto py-10 px-6 space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">
          Financial reports and analytics for your business. Select a report to view live data.
        </p>
      </div>

      {/* Report Cards Grid */}
      <section aria-labelledby="reports-heading">
        <h2 id="reports-heading" className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
          Financial Reports
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTS.map((report) => (
            <ReportCardItem key={report.title} report={report} />
          ))}
        </div>
      </section>

      {/* Export Section */}
      <section aria-labelledby="export-heading">
        <div className="mb-4">
          <h2 id="export-heading" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Data Export
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Export your accounting data to third-party formats for import into Tally, Busy, or any spreadsheet tool.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {EXPORT_BUTTONS.map((btn) => (
            <ExportButtonItem key={btn.type} btn={btn} />
          ))}
        </div>
      </section>
    </div>
  )
}
