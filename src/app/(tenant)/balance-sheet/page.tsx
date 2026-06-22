'use client'

import { useState, useEffect } from 'react'
import { getCurrentFinancialYear } from '@/lib/utils'
import BalanceSheetReportView from '@/components/reports/BalanceSheetReport'
import type { BalanceSheetReport } from '@/lib/accounting/reports'

export default function BalanceSheetPage() {
  const fy = getCurrentFinancialYear()
  const today = new Date().toISOString().split('T')[0]

  const [asOn, setAsOn] = useState(today)
  const [report, setReport] = useState<BalanceSheetReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadReport(date: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/pnl?type=balance_sheet&from=${fy.split('-')[0]}-04-01&to=${date}`)
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load report')
      setReport(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReport(asOn) }, [])

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Balance Sheet</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Financial position as per Schedule III — Companies Act, 2013
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="text-sm border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Date picker */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-end gap-4 mb-6 print:hidden">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">As on Date</label>
          <input
            type="date"
            value={asOn}
            onChange={(e) => setAsOn(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => loadReport(asOn)}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Loading…' : 'Generate'}
        </button>
        <p className="text-xs text-slate-400 self-center ml-2">
          Tip: use browser Print &rarr; "Save as PDF" for a PDF copy
        </p>
      </div>

      {error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </p>
      )}

      {report && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none print:border-none print:p-0">
          <BalanceSheetReportView report={report} />
        </div>
      )}

      {!report && !loading && !error && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Select a date and click Generate to view the Balance Sheet.
        </div>
      )}
    </div>
  )
}
