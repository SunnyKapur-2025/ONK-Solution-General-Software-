'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VOUCHER_TYPES = [
  { value: 'all',         label: 'All Types' },
  { value: 'sales',       label: 'Sales' },
  { value: 'purchase',    label: 'Purchase' },
  { value: 'receipt',     label: 'Receipt' },
  { value: 'payment',     label: 'Payment' },
  { value: 'contra',      label: 'Contra' },
  { value: 'journal',     label: 'Journal' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'debit_note',  label: 'Debit Note' },
]

const TYPE_BADGE: Record<string, string> = {
  sales:       'bg-blue-50 text-blue-700 ring-blue-200',
  purchase:    'bg-orange-50 text-orange-700 ring-orange-200',
  receipt:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
  payment:     'bg-red-50 text-red-700 ring-red-200',
  contra:      'bg-violet-50 text-violet-700 ring-violet-200',
  journal:     'bg-slate-100 text-slate-600 ring-slate-200',
  credit_note: 'bg-teal-50 text-teal-700 ring-teal-200',
  debit_note:  'bg-pink-50 text-pink-700 ring-pink-200',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonthStart(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

function getMonthEnd(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 0)
  return d.toISOString().split('T')[0]
}

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d.toISOString().split('T')[0]
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function labelOf(type: string): string {
  return (VOUCHER_TYPES.find(v => v.value === type)?.label ?? type).replace('_', ' ')
}

// ---------------------------------------------------------------------------
// CSV export (client-side)
// ---------------------------------------------------------------------------

function downloadCSV(entries: DayBookEntry[], from: string, to: string) {
  const headers = ['Date', 'Voucher No', 'Type', 'Party / Narration', 'Debit', 'Credit', 'Balance', 'Status']
  let running = 0
  const rows = entries.map(e => {
    running += e.totalDebit - e.totalCredit
    return [
      fmtDate(e.date),
      e.entryNumber,
      labelOf(e.voucherType),
      e.partyName ? `${e.partyName} — ${e.narration}` : e.narration,
      e.totalDebit > 0 ? e.totalDebit.toFixed(2) : '',
      e.totalCredit > 0 ? e.totalCredit.toFixed(2) : '',
      running.toFixed(2),
      e.status,
    ]
  })

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `day-book_${from}_${to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DayBookPage() {
  const [from,       setFrom]       = useState(getMonthStart)
  const [to,         setTo]         = useState(getMonthEnd)
  const [typeFilter, setTypeFilter] = useState('all')
  const [entries,    setEntries]    = useState<DayBookEntry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [exporting,  setExporting]  = useState(false)

  // ---- fetch ---------------------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ from, to })
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const res = await fetch(`/api/day-book?${params}`)
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      setEntries(data.entries ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entries.')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [from, to, typeFilter])

  useEffect(() => { load() }, []) // load on mount only; user clicks Show to refresh

  // ---- derived values ------------------------------------------------------

  let runningBalance = 0
  const enriched = entries.map(e => {
    runningBalance += e.totalDebit - e.totalCredit
    return { ...e, balance: runningBalance }
  })

  const totalDebit  = entries.reduce((s, e) => s + e.totalDebit,  0)
  const totalCredit = entries.reduce((s, e) => s + e.totalCredit, 0)
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.005

  // ---- Tally XML export ----------------------------------------------------

  async function exportTally() {
    setExporting(true)
    try {
      const params = new URLSearchParams({ from, to, format: 'tally' })
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const res = await fetch(`/api/export?${params}`)
      if (!res.ok) throw new Error(`Export failed: ${res.status}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `day-book_${from}_${to}.xml`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Tally export failed.')
    } finally {
      setExporting(false)
    }
  }

  // ---- quick-range shortcuts -----------------------------------------------

  const quickRanges = [
    { label: 'Today',      f: today(),         t: today() },
    { label: 'This Week',  f: getWeekStart(),  t: today() },
    { label: 'This Month', f: getMonthStart(), t: getMonthEnd() },
  ]

  // -------------------------------------------------------------------------

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Day Book</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Complete chronological ledger of all voucher transactions
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => downloadCSV(entries, from, to)}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <DownloadIcon />
            Download CSV
          </button>
          <button
            onClick={exportTally}
            disabled={entries.length === 0 || exporting}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <TallyIcon />
            {exporting ? 'Exporting…' : 'Tally XML'}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <PrintIcon />
            Print
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Voucher Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {VOUCHER_TYPES.map(vt => (
                <option key={vt.value} value={vt.value}>{vt.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            {loading ? 'Loading…' : 'Show'}
          </button>

          {/* Quick range shortcuts */}
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            {quickRanges.map(r => (
              <button
                key={r.label}
                onClick={() => { setFrom(r.f); setTo(r.t) }}
                className="text-xs text-blue-600 hover:text-blue-800 px-2.5 py-1.5 rounded-md border border-blue-100 hover:bg-blue-50 transition-colors"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <AlertIcon />
          <span>{error}</span>
        </div>
      )}

      {/* ── Summary cards ── */}
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <SummaryCard label="Entries" value={String(entries.length)} neutral />
          <SummaryCard label="Total Debit" value={formatCurrency(totalDebit)} color="blue" />
          <SummaryCard label="Total Credit" value={formatCurrency(totalCredit)} color="emerald" />
          <SummaryCard
            label="Net Balance"
            value={formatCurrency(Math.abs(totalDebit - totalCredit))}
            sub={balanced ? 'Balanced' : totalDebit > totalCredit ? 'Dr excess' : 'Cr excess'}
            color={balanced ? 'emerald' : 'red'}
          />
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[780px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 font-semibold text-slate-600 whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Voucher No.</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Party / Narration</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Debit</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Credit</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-600 whitespace-nowrap">Balance</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <LoadingSpinner />
                    <p className="text-slate-400 text-sm mt-3">Fetching entries…</p>
                  </td>
                </tr>
              )}

              {!loading && enriched.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <EmptyIcon />
                    <p className="text-slate-500 font-medium mt-3">No entries found</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Try adjusting the date range or voucher type filter.
                    </p>
                  </td>
                </tr>
              )}

              {!loading && enriched.map((e, idx) => (
                <tr
                  key={e.id}
                  className={`group transition-colors hover:bg-blue-50/40 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                >
                  {/* Date */}
                  <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {fmtDate(e.date)}
                  </td>

                  {/* Voucher No. */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      {e.entryNumber}
                    </span>
                  </td>

                  {/* Type badge */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ring-1 capitalize ${TYPE_BADGE[e.voucherType] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}
                    >
                      {labelOf(e.voucherType)}
                    </span>
                  </td>

                  {/* Party / Narration */}
                  <td className="px-4 py-3 max-w-xs">
                    {e.partyName && (
                      <p className="font-medium text-slate-800 truncate">{e.partyName}</p>
                    )}
                    <p className={`text-slate-500 truncate ${e.partyName ? 'text-xs mt-0.5' : 'text-slate-800 font-medium'}`}>
                      {e.narration}
                    </p>
                  </td>

                  {/* Debit */}
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                    {e.totalDebit > 0 ? (
                      <span className="text-slate-800">{formatCurrency(e.totalDebit)}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Credit */}
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700">
                    {e.totalCredit > 0 ? (
                      <span className="text-slate-800">{formatCurrency(e.totalCredit)}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Running balance */}
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    <span className={e.balance >= 0 ? 'text-slate-800' : 'text-red-600'}>
                      {formatCurrency(Math.abs(e.balance))}
                    </span>
                    <span className={`ml-1 text-xs font-medium ${e.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                      {e.balance >= 0 ? 'Dr' : 'Cr'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Totals footer */}
            {!loading && entries.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={4} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold font-mono tabular-nums text-slate-900">
                    {formatCurrency(totalDebit)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold font-mono tabular-nums text-slate-900">
                    {formatCurrency(totalCredit)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        balanced
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {balanced ? <CheckIcon /> : <AlertIcon />}
                      {balanced ? 'Balanced' : 'Unbalanced'}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  sub,
  color,
  neutral,
}: {
  label: string
  value: string
  sub?: string
  color?: 'blue' | 'emerald' | 'red'
  neutral?: boolean
}) {
  const accent =
    color === 'blue'    ? 'text-blue-700' :
    color === 'emerald' ? 'text-emerald-700' :
    color === 'red'     ? 'text-red-600' :
    'text-slate-800'

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 shadow-sm">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${accent}`}>{value}</p>
      {sub && (
        <p className={`text-xs mt-0.5 ${color === 'red' ? 'text-red-500' : 'text-slate-400'}`}>{sub}</p>
      )}
    </div>
  )
}

// ---- Inline SVG icons (no external dependency) ----------------------------

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11" />
    </svg>
  )
}

function TallyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M4 4l16 16M4 20h16" />
    </svg>
  )
}

function PrintIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V4h12v5M6 18H4a1 1 0 01-1-1v-6a1 1 0 011-1h16a1 1 0 011 1v6a1 1 0 01-1 1h-2m-10 0h8v4H6v-4z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  )
}

function EmptyIcon() {
  return (
    <svg className="mx-auto w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M9 12h6" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="mx-auto w-7 h-7 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
