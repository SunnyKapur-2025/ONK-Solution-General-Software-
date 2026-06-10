'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, getCurrentFinancialYear } from '@/lib/utils'
import type { PnLReport } from '@/lib/accounting/reports'

export default function PnLReportPage() {
  const fy = getCurrentFinancialYear()
  const fyYear = parseInt(fy.split('-')[0])
  const defaultFrom = `${fyYear}-04-01`
  const defaultTo   = new Date().toISOString().split('T')[0]

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [report, setReport] = useState<PnLReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadReport() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/pnl?from=${from}&to=${to}&type=pnl`)
      if (!res.ok) throw new Error((await res.json()).error)
      setReport(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReport() }, [])

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profit & Loss Statement</h1>
          <p className="text-slate-500 text-sm mt-0.5">Financial Year {fy}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="text-sm border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50"
        >
          Print / PDF
        </button>
      </div>

      {/* Date filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-end gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={loadReport}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium">
          {loading ? 'Loading…' : 'Generate'}
        </button>
      </div>

      {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">{error}</p>}

      {report && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none">

          {/* ── INCOME ── */}
          <div className="px-6 py-4 bg-green-50 border-b border-green-100">
            <h2 className="font-bold text-green-900 text-base">INCOME</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {report.income.map((a) => (
                <tr key={a.accountId} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-2.5 text-slate-700">{a.accountName}</td>
                  <td className="px-6 py-2.5 text-right font-mono text-slate-800">{formatCurrency(a.balance)}</td>
                </tr>
              ))}
              {report.income.length === 0 && (
                <tr><td colSpan={2} className="px-6 py-3 text-slate-400 text-center">No income entries in this period</td></tr>
              )}
              <tr className="bg-green-50 border-t-2 border-green-200">
                <td className="px-6 py-3 font-bold text-green-900">Total Income</td>
                <td className="px-6 py-3 text-right font-bold font-mono text-green-900">{formatCurrency(report.totalIncome)}</td>
              </tr>
            </tbody>
          </table>

          {/* ── DIRECT EXPENSES ── */}
          <div className="px-6 py-4 bg-red-50 border-b border-red-100 border-t border-slate-200">
            <h2 className="font-bold text-red-900 text-base">DIRECT EXPENSES (Cost of Services / Goods)</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {report.directExpenses.map((a) => (
                <tr key={a.accountId} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-2.5 text-slate-700">{a.accountName}</td>
                  <td className="px-6 py-2.5 text-right font-mono text-slate-800">{formatCurrency(a.balance)}</td>
                </tr>
              ))}
              {report.directExpenses.length === 0 && (
                <tr><td colSpan={2} className="px-6 py-3 text-slate-400 text-center">No direct expenses in this period</td></tr>
              )}
              <tr className={`border-t-2 font-bold ${report.grossProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <td className={`px-6 py-3 ${report.grossProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  Gross {report.grossProfit >= 0 ? 'Profit' : 'Loss'}
                </td>
                <td className={`px-6 py-3 text-right font-mono ${report.grossProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {formatCurrency(Math.abs(report.grossProfit))}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── INDIRECT EXPENSES ── */}
          <div className="px-6 py-4 bg-orange-50 border-b border-orange-100 border-t border-slate-200">
            <h2 className="font-bold text-orange-900 text-base">INDIRECT EXPENSES (Operating Expenses)</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {report.indirectExpenses.map((a) => (
                <tr key={a.accountId} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-2.5 text-slate-700">{a.accountName}</td>
                  <td className="px-6 py-2.5 text-right font-mono text-slate-800">{formatCurrency(a.balance)}</td>
                </tr>
              ))}
              {report.indirectExpenses.length === 0 && (
                <tr><td colSpan={2} className="px-6 py-3 text-slate-400 text-center">No indirect expenses in this period</td></tr>
              )}
            </tbody>
          </table>

          {/* ── NET PROFIT ── */}
          <div className={`px-6 py-5 border-t-2 ${report.netProfit >= 0 ? 'bg-green-600 border-green-700' : 'bg-red-600 border-red-700'}`}>
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-lg">
                Net {report.netProfit >= 0 ? 'Profit' : 'Loss'} for the Period
              </span>
              <span className="text-white font-bold text-xl font-mono">
                {formatCurrency(Math.abs(report.netProfit))}
              </span>
            </div>
            <p className="text-white/70 text-xs mt-1">
              {report.fromDate} to {report.toDate}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
