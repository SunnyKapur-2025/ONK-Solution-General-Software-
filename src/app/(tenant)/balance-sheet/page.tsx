'use client'

import { useState, useEffect } from 'react'
import { getCurrentFinancialYear } from '@/lib/utils'
import BalanceSheetReportView from '@/components/reports/BalanceSheetReport'
import type { BalanceSheetReport } from '@/lib/accounting/reports'

export default function BalanceSheetPage() {
  const fy = getCurrentFinancialYear()
  const fyYear = parseInt(fy.split('-')[0])
  const today = new Date().toISOString().split('T')[0]

  const [asOn, setAsOn] = useState(today)
  const [comparePrev, setComparePrev] = useState(true)
  const [report, setReport] = useState<BalanceSheetReport | null>(null)
  const [prevReport, setPrevReport] = useState<BalanceSheetReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadReport(date: string) {
    setLoading(true)
    setError('')
    try {
      const fyFrom = `${fyYear}-04-01`
      const prevFyFrom = `${fyYear - 1}-04-01`
      const prevFyTo = `${fyYear}-03-31`

      const [res, prevRes] = await Promise.all([
        fetch(`/api/reports/pnl?type=balance_sheet&from=${fyFrom}&to=${date}`),
        comparePrev ? fetch(`/api/reports/pnl?type=balance_sheet&from=${prevFyFrom}&to=${prevFyTo}`) : Promise.resolve(null),
      ])

      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load report')
      const d = await res.json()
      setReport(d.current ?? d)

      if (prevRes && prevRes.ok) {
        const pd = await prevRes.json()
        setPrevReport(pd.current ?? pd)
      } else {
        setPrevReport(null)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReport(asOn) }, [])

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm 10mm 12mm 10mm; }
          body * { visibility: hidden; }
          #bs-printable, #bs-printable * { visibility: visible; }
          #bs-printable { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto py-8 px-6">
        <div className="flex items-start justify-between mb-6 no-print">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Balance Sheet</h1>
            <p className="text-slate-500 text-sm mt-0.5">Schedule III — Companies Act, 2013</p>
          </div>
          <button onClick={() => window.print()}
            className="text-sm border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50">
            🖨 Print / PDF
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-4 mb-6 no-print">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">As on Date</label>
            <input type="date" value={asOn} onChange={e => setAsOn(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={comparePrev} onChange={e => setComparePrev(e.target.checked)}
              className="rounded" />
            Show previous year figures
          </label>
          <button onClick={() => loadReport(asOn)} disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium">
            {loading ? 'Loading…' : 'Generate'}
          </button>
        </div>

        {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm no-print">{error}</p>}

        {report && (
          <div id="bs-printable" className="bg-white border border-slate-200 shadow-sm p-6 print:shadow-none print:border-none print:p-0">
            <BalanceSheetReportView report={report} prevReport={comparePrev ? prevReport : null} />
          </div>
        )}

        {!report && !loading && !error && (
          <div className="text-center py-16 text-slate-400 text-sm no-print">
            Select a date and click Generate to view the Balance Sheet.
          </div>
        )}
      </div>
    </>
  )
}
