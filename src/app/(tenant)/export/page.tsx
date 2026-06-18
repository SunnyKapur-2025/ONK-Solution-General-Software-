'use client'

import { useState } from 'react'

export default function ExportPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [format, setFormat] = useState<'tally' | 'busy'>('tally')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleExport() {
    if (!dateFrom || !dateTo) {
      setError('Please select a date range.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/export?from=${dateFrom}&to=${dateTo}&format=${format}`)
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || 'Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = format === 'tally'
        ? `ONK_Tally_Export_${dateFrom}_to_${dateTo}.xml`
        : `ONK_Busy_Export_${dateFrom}_to_${dateTo}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Export Data</h1>
        <p className="text-slate-500 text-sm mt-1">
          Export your accounting data to Tally or Busy format for your CA or existing software.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">

        {/* Format selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Export Format</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: 'tally', label: 'Tally Prime / ERP 9', desc: '.XML file — import directly into Tally' },
              { val: 'busy',  label: 'Busy Accounting',     desc: '.CSV file — import directly into Busy' },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setFormat(opt.val as 'tally' | 'busy')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  format === opt.val
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className={`font-semibold text-sm ${format === opt.val ? 'text-blue-800' : 'text-slate-800'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* What gets exported */}
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-800 mb-2">What&apos;s included in the export:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>All sales and service invoices</li>
            <li>All purchase and expense entries</li>
            <li>All money received and payments made</li>
            <li>GST details (CGST, SGST, IGST)</li>
            <li>Party names and ledger accounts</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Your CA can import this file directly into Tally or Busy without re-entering any data.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
        >
          {loading ? 'Generating export…' : `Download ${format === 'tally' ? 'Tally XML' : 'Busy CSV'}`}
        </button>
      </div>
    </div>
  )
}
