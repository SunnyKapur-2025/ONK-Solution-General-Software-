'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

interface CashLine {
  entry_number: string
  entry_date: string
  narration: string
  debit: number
  credit: number
}

export default function CashPage() {
  const today = new Date().toISOString().split('T')[0]
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [lines, setLines] = useState<CashLine[]>([])
  const [openingBalance, setOpeningBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/ledger?accountCode=1610&from=${from}&to=${to}`)
      if (res.ok) {
        const data = await res.json()
        setOpeningBalance(data.openingBalance ?? 0)
        setLines(data.lines ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalIn  = lines.reduce((s, l) => s + (l.debit || 0), 0)
  const totalOut = lines.reduce((s, l) => s + (l.credit || 0), 0)
  const closing  = openingBalance + totalIn - totalOut

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Cash Book</h1>
        <p className="text-slate-500 text-sm mt-0.5">Track all cash receipts and payments</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Opening Balance</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(openingBalance)}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <p className="text-xs text-green-600">Cash In</p>
          <p className="text-xl font-bold text-green-700 mt-1">+ {formatCurrency(totalIn)}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <p className="text-xs text-red-600">Cash Out</p>
          <p className="text-xl font-bold text-red-700 mt-1">- {formatCurrency(totalOut)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-xs text-blue-600">Closing Balance</p>
          <p className="text-xl font-bold text-blue-800 mt-1">{formatCurrency(closing)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4 items-end mb-5">
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
        <button onClick={load} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium">
          {loading ? 'Loading…' : 'Show'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-slate-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Entry No.</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
              <th className="text-right px-4 py-3 font-medium text-green-600">Cash In</th>
              <th className="text-right px-4 py-3 font-medium text-red-600">Cash Out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {lines.map((l, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {new Date(l.entry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{l.entry_number}</td>
                <td className="px-4 py-3 text-slate-800">{l.narration}</td>
                <td className="px-4 py-3 text-right font-mono text-green-700">{l.debit > 0 ? formatCurrency(l.debit) : '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-red-600">{l.credit > 0 ? formatCurrency(l.credit) : '—'}</td>
              </tr>
            ))}
            {!loading && lines.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">No cash transactions for this period.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
