'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

// ─── Types ──────────────────────────────────────────────────────────────────

type GSTTransaction = {
  id: string
  date: string
  invoiceNumber: string
  party: string
  type: 'B2B' | 'B2C' | 'purchase'
  taxableAmount: number
  cgst: number
  sgst: number
  igst: number
  total: number
  direction: 'output' | 'input'
}

type MonthGST = {
  month: string
  outputCGST: number
  outputSGST: number
  outputIGST: number
  inputCGST: number
  inputSGST: number
  inputIGST: number
  netPayable: number
  transactions?: GSTTransaction[]
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function toCSV(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n')
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Month / Year selector options ───────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function buildYearOptions() {
  const current = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => current - i)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GstPage() {
  const { show } = useToast()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const [allData, setAllData] = useState<MonthGST[]>([])
  const [transactions, setTransactions] = useState<GSTTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(false)
  const [error, setError] = useState('')

  const periodKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`

  // ── Load aggregate GST summary ──────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/gst')
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to load GST data')
      const json = await res.json()
      setAllData(Array.isArray(json) ? json : [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load GST data')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Load transactions for selected period ────────────────────────────────────
  const loadTransactions = useCallback(async () => {
    setTxLoading(true)
    try {
      const res = await fetch(`/api/gst?period=${periodKey}`)
      if (!res.ok) throw new Error('Failed to load transactions')
      const json = await res.json()
      // Support both {transactions:[]} and flat array responses
      const txList: GSTTransaction[] = Array.isArray(json)
        ? json
        : Array.isArray(json.transactions)
        ? json.transactions
        : []
      setTransactions(txList)
    } catch {
      setTransactions([])
    } finally {
      setTxLoading(false)
    }
  }, [periodKey])

  useEffect(() => { loadSummary() }, [loadSummary])
  useEffect(() => { loadTransactions() }, [loadTransactions])

  // ── Derived figures for the selected period ──────────────────────────────────
  const periodData = allData.find((d) => d.month === periodKey)

  const outputGST = periodData
    ? periodData.outputCGST + periodData.outputSGST + periodData.outputIGST
    : 0
  const inputCredit = periodData
    ? periodData.inputCGST + periodData.inputSGST + periodData.inputIGST
    : 0
  const netPayable = periodData ? periodData.netPayable : 0

  // ── GSTR-1 groupings ─────────────────────────────────────────────────────────
  const b2bTx = transactions.filter((t) => t.type === 'B2B' && t.direction === 'output')
  const b2cTx = transactions.filter((t) => t.type === 'B2C' && t.direction === 'output')

  const b2bTaxable = b2bTx.reduce((s, t) => s + t.taxableAmount, 0)
  const b2bGST = b2bTx.reduce((s, t) => s + t.cgst + t.sgst + t.igst, 0)
  const b2cTaxable = b2cTx.reduce((s, t) => s + t.taxableAmount, 0)
  const b2cGST = b2cTx.reduce((s, t) => s + t.cgst + t.sgst + t.igst, 0)

  // ── Download GSTR-1 CSV ───────────────────────────────────────────────────────
  function downloadGSTR1() {
    const outTx = transactions.filter((t) => t.direction === 'output')
    if (outTx.length === 0) {
      show('No outward supply transactions found for this period.', 'error')
      return
    }
    const rows = outTx.map((t) => ({
      'Invoice No': t.invoiceNumber,
      'Date': t.date,
      'Party Name': t.party,
      'Invoice Type': t.type,
      'Taxable Value': t.taxableAmount,
      'CGST': t.cgst,
      'SGST': t.sgst,
      'IGST': t.igst,
      'Total Tax': t.cgst + t.sgst + t.igst,
      'Invoice Total': t.total,
    }))
    downloadCSV(`GSTR-1_${periodKey}.csv`, toCSV(rows))
  }

  // ── Download GSTR-3B CSV ──────────────────────────────────────────────────────
  function downloadGSTR3B() {
    if (!periodData) {
      show('No GST summary data found for this period.', 'error')
      return
    }
    const rows = [
      {
        'Period': periodKey,
        'Output CGST': periodData.outputCGST,
        'Output SGST': periodData.outputSGST,
        'Output IGST': periodData.outputIGST,
        'Total Output Tax': outputGST,
        'Input CGST': periodData.inputCGST,
        'Input SGST': periodData.inputSGST,
        'Input IGST': periodData.inputIGST,
        'Total Input Credit': inputCredit,
        'Net Payable': netPayable,
      },
    ]
    downloadCSV(`GSTR-3B_${periodKey}.csv`, toCSV(rows))
  }

  const years = buildYearOptions()

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">GST Compliance</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Returns reconciliation — file on the GST portal after review
          </p>
        </div>
        <a
          href="https://www.gst.gov.in/auth/login"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          GST Portal Login &rarr;
        </a>
      </div>

      {/* ── Period Selector ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-6 py-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Return Period
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 mt-auto">
            <span className="text-xs text-slate-400">Selected period</span>
            <span className="text-sm font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              {MONTHS[selectedMonth]} {selectedYear}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading GST data&hellip;</div>
      ) : (
        <>
          {/* ── Summary Cards ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Output GST */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Output GST (from Sales)
              </p>
              <p className="text-2xl font-bold text-slate-900 mb-3">
                {formatCurrency(outputGST)}
              </p>
              <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span>CGST</span>
                  <span className="font-mono">{formatCurrency(periodData?.outputCGST ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST</span>
                  <span className="font-mono">{formatCurrency(periodData?.outputSGST ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGST</span>
                  <span className="font-mono">{formatCurrency(periodData?.outputIGST ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* Input Credit */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Input Credit (from Purchases)
              </p>
              <p className="text-2xl font-bold text-blue-700 mb-3">
                {formatCurrency(inputCredit)}
              </p>
              <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span>CGST</span>
                  <span className="font-mono">{formatCurrency(periodData?.inputCGST ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST</span>
                  <span className="font-mono">{formatCurrency(periodData?.inputSGST ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGST</span>
                  <span className="font-mono">{formatCurrency(periodData?.inputIGST ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* Net Payable */}
            <div
              className={`rounded-xl shadow-sm p-5 border ${
                netPayable >= 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                  netPayable >= 0 ? 'text-green-700' : 'text-orange-700'
                }`}
              >
                {netPayable >= 0 ? 'Net Payable' : 'Net Refundable'}
              </p>
              <p
                className={`text-2xl font-bold mb-3 ${
                  netPayable >= 0 ? 'text-green-900' : 'text-orange-900'
                }`}
              >
                {formatCurrency(Math.abs(netPayable))}
              </p>
              <div
                className={`text-xs border-t pt-3 space-y-1 ${
                  netPayable >= 0
                    ? 'border-green-200 text-green-800'
                    : 'border-orange-200 text-orange-800'
                }`}
              >
                <div className="flex justify-between">
                  <span>Output GST</span>
                  <span className="font-mono">+ {formatCurrency(outputGST)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Input Credit</span>
                  <span className="font-mono">- {formatCurrency(inputCredit)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1 mt-1 border-current/20">
                  <span>{netPayable >= 0 ? 'Payable' : 'Refund'}</span>
                  <span className="font-mono">{formatCurrency(Math.abs(netPayable))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Transaction Table ───────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-slate-800">
                  GST Transactions &mdash; {MONTHS[selectedMonth]} {selectedYear}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  All taxable entries recorded for this period
                </p>
              </div>
              {transactions.length > 0 && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {transactions.length} record{transactions.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {txLoading ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Loading transactions&hellip;
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-14 text-slate-400 text-sm">
                No GST transactions found for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {[
                        'Date', 'Invoice No', 'Party', 'Type', 'Direction',
                        'Taxable Amt', 'CGST', 'SGST', 'IGST', 'Total Tax',
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{tx.date}</td>
                        <td className="px-4 py-3 font-mono text-slate-700 text-xs whitespace-nowrap">
                          {tx.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate">
                          {tx.party}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              tx.type === 'B2B'
                                ? 'bg-purple-100 text-purple-700'
                                : tx.type === 'B2C'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              tx.direction === 'output'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-green-50 text-green-700'
                            }`}
                          >
                            {tx.direction === 'output' ? 'Sale' : 'Purchase'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                          {formatCurrency(tx.taxableAmount)}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {formatCurrency(tx.cgst)}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {formatCurrency(tx.sgst)}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {formatCurrency(tx.igst)}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {formatCurrency(tx.cgst + tx.sgst + tx.igst)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── GSTR-1 Summary ─────────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-800">GSTR-1 Summary &mdash; Outward Supplies</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Invoices issued during {MONTHS[selectedMonth]} {selectedYear}
                </p>
              </div>
              <button
                onClick={downloadGSTR1}
                className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download GSTR-1 CSV
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* B2B */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      B2B Invoices
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Registered buyers (GSTIN)</p>
                  </div>
                  <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                    {b2bTx.length} invoices
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Value</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatCurrency(b2bTaxable)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST Charged</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatCurrency(b2bGST)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2 mt-2">
                    <span className="font-medium">Invoice Total</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(b2bTaxable + b2bGST)}
                    </span>
                  </div>
                </div>
              </div>

              {/* B2C */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      B2C Invoices
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Unregistered / end consumers</p>
                  </div>
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                    {b2cTx.length} invoices
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Value</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatCurrency(b2cTaxable)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST Charged</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatCurrency(b2cGST)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2 mt-2">
                    <span className="font-medium">Invoice Total</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrency(b2cTaxable + b2cGST)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── GSTR-3B Summary ─────────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-800">GSTR-3B Summary &mdash; Net Tax Payable</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monthly consolidated return for {MONTHS[selectedMonth]} {selectedYear}
                </p>
              </div>
              <button
                onClick={downloadGSTR3B}
                className="flex items-center gap-2 text-sm bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download GSTR-3B CSV
              </button>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Head
                      </th>
                      <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        CGST
                      </th>
                      <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        SGST
                      </th>
                      <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        IGST
                      </th>
                      <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <tr>
                      <td className="py-3 text-slate-700 font-medium">Output Tax (3.1)</td>
                      <td className="py-3 text-right font-mono text-slate-600">
                        {formatCurrency(periodData?.outputCGST ?? 0)}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-600">
                        {formatCurrency(periodData?.outputSGST ?? 0)}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-600">
                        {formatCurrency(periodData?.outputIGST ?? 0)}
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(outputGST)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 text-slate-700 font-medium">Input Tax Credit (4)</td>
                      <td className="py-3 text-right font-mono text-blue-600">
                        {formatCurrency(periodData?.inputCGST ?? 0)}
                      </td>
                      <td className="py-3 text-right font-mono text-blue-600">
                        {formatCurrency(periodData?.inputSGST ?? 0)}
                      </td>
                      <td className="py-3 text-right font-mono text-blue-600">
                        {formatCurrency(periodData?.inputIGST ?? 0)}
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-blue-700">
                        {formatCurrency(inputCredit)}
                      </td>
                    </tr>
                    <tr className="border-t-2 border-slate-300 bg-slate-50">
                      <td className="py-3 px-2 font-bold text-slate-800">
                        {netPayable >= 0 ? 'Net Tax Payable (5)' : 'Net Refund (5)'}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(
                          Math.abs((periodData?.outputCGST ?? 0) - (periodData?.inputCGST ?? 0))
                        )}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(
                          Math.abs((periodData?.outputSGST ?? 0) - (periodData?.inputSGST ?? 0))
                        )}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(
                          Math.abs((periodData?.outputIGST ?? 0) - (periodData?.inputIGST ?? 0))
                        )}
                      </td>
                      <td
                        className={`py-3 text-right font-mono font-bold text-lg ${
                          netPayable >= 0 ? 'text-green-700' : 'text-orange-600'
                        }`}
                      >
                        {formatCurrency(Math.abs(netPayable))}
                        {netPayable < 0 && (
                          <span className="text-xs ml-1 font-medium">(Refund)</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Footer Note ─────────────────────────────────────────────────────── */}
          <p className="text-xs text-slate-400 text-center pb-4">
            This page is for reconciliation purposes only. File your returns directly on the GST portal after verifying these figures.
          </p>
        </>
      )}
    </div>
  )
}
