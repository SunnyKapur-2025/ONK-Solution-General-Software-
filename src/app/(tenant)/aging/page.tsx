'use client'

import { useState, useEffect } from 'react'

type AgingRow = {
  partyName: string
  bucket0to30: number
  bucket31to60: number
  bucket61to90: number
  bucket91to180: number
  bucket180plus: number
  total: number
}

type Tab = 'debtor' | 'creditor'

export default function AgingPage() {
  const [tab, setTab] = useState<Tab>('debtor')
  const [data, setData] = useState<AgingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setData([])
    fetch(`/api/reports/aging?type=${tab}`)
      .then(r => r.json())
      .then(json => {
        const rows: AgingRow[] = json?.aging ?? []
        setData(rows)
      })
      .catch(() => setError('Failed to load aging data.'))
      .finally(() => setLoading(false))
  }, [tab])

  const fmt = (n: number) =>
    n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Aging Report</h1>
        <button
          onClick={() => window.print()}
          className="border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Print
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {(['debtor', 'creditor'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg -mb-px border border-transparent ${
              tab === t
                ? 'border-slate-200 border-b-white bg-white text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'debtor' ? 'Debtors Aging' : 'Creditors Aging'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Party Name</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">0–30 days</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">31–60 days</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">61–90 days</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">91–180 days</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">180+ days</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">Loading…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-red-400">{error}</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No aging data available.
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-800">{row.partyName}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(row.bucket0to30)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(row.bucket31to60)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(row.bucket61to90)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(row.bucket91to180)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(row.bucket180plus)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(row.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
