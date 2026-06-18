'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface DayBookEntry {
  id: string
  entryNumber: string
  date: string
  voucherType: string
  narration: string
  partyName?: string
  totalDebit: number
  totalCredit: number
  status: string
  createdBy: string
}

const TYPE_COLORS: Record<string, string> = {
  sales:       'bg-blue-100 text-blue-700',
  purchase:    'bg-orange-100 text-orange-700',
  receipt:     'bg-green-100 text-green-700',
  payment:     'bg-red-100 text-red-700',
  contra:      'bg-purple-100 text-purple-700',
  journal:     'bg-slate-100 text-slate-700',
  credit_note: 'bg-teal-100 text-teal-700',
  debit_note:  'bg-pink-100 text-pink-700',
}

export default function DayBookPage() {
  const today = new Date().toISOString().split('T')[0]
  const [from, setFrom] = useState(today)
  const [to,   setTo]   = useState(today)
  const [typeFilter, setTypeFilter] = useState('all')
  const [entries, setEntries] = useState<DayBookEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const res = await fetch(`/api/day-book?${params}`)
      const data = await res.json()
      setEntries(data.entries || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const totalDebit  = entries.reduce((s, e) => s + e.totalDebit, 0)
  const totalCredit = entries.reduce((s, e) => s + e.totalCredit, 0)

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Day Book</h1>
          <p className="text-slate-500 text-sm mt-0.5">Every transaction in chronological order — your complete ledger view</p>
        </div>
        <button onClick={() => window.print()}
          className="text-sm border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50">
          Print
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-end gap-4 mb-5">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Voucher Type</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="all">All Types</option>
            <option value="sales">Sales</option>
            <option value="purchase">Purchase</option>
            <option value="receipt">Receipt</option>
            <option value="payment">Payment</option>
            <option value="contra">Contra</option>
            <option value="journal">Journal</option>
          </select>
        </div>
        <button onClick={load}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium">
          {loading ? 'Loading…' : 'Show'}
        </button>
        {/* Quick date shortcuts */}
        <div className="flex gap-2 ml-auto">
          {[
            { label: 'Today',     f: today, t: today },
            { label: 'This Week', f: getWeekStart(), t: today },
            { label: 'This Month',f: getMonthStart(), t: today },
          ].map(s => (
            <button key={s.label}
              onClick={() => { setFrom(s.f); setTo(s.t) }}
              className="text-xs text-blue-600 hover:underline px-2 py-1 rounded border border-blue-100 hover:bg-blue-50">
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Entry No.</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Debit</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Credit</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-slate-50 cursor-pointer group">
                <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{e.entryNumber}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_COLORS[e.voucherType] || 'bg-slate-100 text-slate-600'}`}>
                    {e.voucherType.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-800 font-medium">{e.narration}</p>
                  {e.partyName && <p className="text-slate-500 text-xs mt-0.5">{e.partyName}</p>}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-700">
                  {e.totalDebit > 0 ? formatCurrency(e.totalDebit) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-700">
                  {e.totalCredit > 0 ? formatCurrency(e.totalCredit) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    e.status === 'posted' ? 'bg-green-100 text-green-700' :
                    e.status === 'draft'  ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-600'}`}>
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                No entries found for this period.
              </td></tr>
            )}
          </tbody>
          {entries.length > 0 && (
            <tfoot className="bg-slate-100 border-t-2 border-slate-300">
              <tr>
                <td colSpan={4} className="px-5 py-3 font-bold text-slate-700">{entries.length} entries</td>
                <td className="px-4 py-3 text-right font-bold font-mono text-slate-900">{formatCurrency(totalDebit)}</td>
                <td className="px-4 py-3 text-right font-bold font-mono text-slate-900">{formatCurrency(totalCredit)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-xs font-bold ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'text-green-700' : 'text-red-600'}`}>
                    {Math.abs(totalDebit - totalCredit) < 0.01 ? '✓ Balanced' : 'Unbalanced!'}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

function getWeekStart(): string {
  const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1)
  return d.toISOString().split('T')[0]
}
function getMonthStart(): string {
  const d = new Date(); d.setDate(1)
  return d.toISOString().split('T')[0]
}
