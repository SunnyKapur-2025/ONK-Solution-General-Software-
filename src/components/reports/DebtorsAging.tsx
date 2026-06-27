'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

interface AgingRow {
  partyId: string
  partyName: string
  current: number
  days31_60: number
  days61_90: number
  days91_180: number
  above180: number
  total: number
}

interface Props {
  type: 'debtors' | 'creditors'
}

export default function AgingReport({ type }: Props) {
  const [data, setData] = useState<AgingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const label = type === 'debtors' ? 'Debtors' : 'Creditors'

  useEffect(() => {
    fetch(`/api/reports/aging?type=${type}`)
      .then((r) => r.json())
      .then((d) => { setData(d.rows || []); setLoading(false) })
      .catch(() => { setError('Failed to load'); setLoading(false) })
  }, [type])

  const totals = data.reduce(
    (acc, row) => ({
      current:    acc.current    + row.current,
      days31_60:  acc.days31_60  + row.days31_60,
      days61_90:  acc.days61_90  + row.days61_90,
      days91_180: acc.days91_180 + row.days91_180,
      above180:   acc.above180   + row.above180,
      total:      acc.total      + row.total,
    }),
    { current: 0, days31_60: 0, days61_90: 0, days91_180: 0, above180: 0, total: 0 }
  )

  if (loading) return <div className="py-12 text-center text-slate-400">Loading {label} report…</div>
  if (error)   return <div className="py-6 text-center text-red-500">{error}</div>

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{label} Aging Summary</h1>
          <p className="text-slate-500 text-sm mt-0.5">Outstanding amounts by age bucket</p>
        </div>
        <button onClick={() => window.print()}
          className="text-sm border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50">
          Print / PDF
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: '0–30 days',   value: totals.current,    color: 'green'  },
          { label: '31–60 days',  value: totals.days31_60,  color: 'yellow' },
          { label: '61–90 days',  value: totals.days61_90,  color: 'orange' },
          { label: '91–180 days', value: totals.days91_180, color: 'red'    },
          { label: '180+ days',   value: totals.above180,   color: 'red'    },
        ].map((b) => (
          <div key={b.label} className={`bg-${b.color}-50 border border-${b.color}-200 rounded-xl p-3 text-center`}>
            <p className={`text-xs font-medium text-${b.color}-700 mb-1`}>{b.label}</p>
            <p className={`text-sm font-bold font-mono text-${b.color}-900`}>{formatCurrency(b.value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3.5 font-medium text-slate-600">Party Name</th>
              <th className="text-right px-4 py-3.5 font-medium text-green-700">0–30 days</th>
              <th className="text-right px-4 py-3.5 font-medium text-yellow-700">31–60 days</th>
              <th className="text-right px-4 py-3.5 font-medium text-orange-700">61–90 days</th>
              <th className="text-right px-4 py-3.5 font-medium text-red-700">91–180 days</th>
              <th className="text-right px-4 py-3.5 font-medium text-red-900">180+ days</th>
              <th className="text-right px-5 py-3.5 font-bold text-slate-700">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((row) => (
              <tr key={row.partyId} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-800">{row.partyName}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-600">{row.current > 0 ? formatCurrency(row.current) : '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-600">{row.days31_60 > 0 ? formatCurrency(row.days31_60) : '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-orange-700">{row.days61_90 > 0 ? formatCurrency(row.days61_90) : '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-red-700">{row.days91_180 > 0 ? formatCurrency(row.days91_180) : '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-red-900 font-semibold">{row.above180 > 0 ? formatCurrency(row.above180) : '—'}</td>
                <td className="px-5 py-3 text-right font-bold font-mono text-slate-900">{formatCurrency(row.total)}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">No outstanding {label.toLowerCase()} found.</td></tr>
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot className="bg-slate-100 border-t-2 border-slate-300">
              <tr>
                <td className="px-5 py-3 font-bold text-slate-900">TOTAL</td>
                <td className="px-4 py-3 text-right font-bold font-mono">{formatCurrency(totals.current)}</td>
                <td className="px-4 py-3 text-right font-bold font-mono">{formatCurrency(totals.days31_60)}</td>
                <td className="px-4 py-3 text-right font-bold font-mono text-orange-700">{formatCurrency(totals.days61_90)}</td>
                <td className="px-4 py-3 text-right font-bold font-mono text-red-700">{formatCurrency(totals.days91_180)}</td>
                <td className="px-4 py-3 text-right font-bold font-mono text-red-900">{formatCurrency(totals.above180)}</td>
                <td className="px-5 py-3 text-right font-bold font-mono text-slate-900 text-base">{formatCurrency(totals.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="text-xs text-slate-400 mt-3 text-center">
        {type === 'debtors'
          ? 'Amounts shown are money owed TO your business. Red = overdue.'
          : 'Amounts shown are money your business OWES. Pay overdue amounts to avoid interest.'}
      </p>
    </div>
  )
}
