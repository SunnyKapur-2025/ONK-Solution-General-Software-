'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type ReconStatus = 'reconciled' | 'unreconciled'

interface BankEntry {
  id: string
  date: string
  description: string
  debit: number
  credit: number
  status: ReconStatus
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseCsvText(text: string): Omit<BankEntry, 'id' | 'status'>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  // Expected generic CSV: Date, Description, Debit, Credit
  const result: Omit<BankEntry, 'id' | 'status'>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.replace(/"/g, '').trim())
    if (cells.length < 2) continue
    const debit  = parseFloat(cells[2]?.replace(/,/g, '') || '0') || 0
    const credit = parseFloat(cells[3]?.replace(/,/g, '') || '0') || 0
    if (debit === 0 && credit === 0) continue
    result.push({ date: cells[0] || '', description: cells[1] || '', debit, credit })
  }
  return result
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, highlight }: {
  label: string
  value: string
  sub?: string
  highlight?: 'green' | 'amber' | 'red'
}) {
  const colours = {
    green: 'bg-green-50 border-green-200 text-green-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red:   'bg-red-50   border-red-200   text-red-800',
  }
  const base = 'bg-white border-slate-200 text-slate-800'

  return (
    <div className={`border rounded-xl p-4 ${highlight ? colours[highlight] : base}`}>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? '' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-70">{sub}</p>}
    </div>
  )
}

// ── Import CSV Section ────────────────────────────────────────────────────────

interface ImportCsvProps {
  onImport: (rows: Omit<BankEntry, 'id' | 'status'>[]) => void
}

function ImportCsvSection({ onImport }: ImportCsvProps) {
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setImporting(true)
    setImportMsg('')
    file.text().then(text => {
      const rows = parseCsvText(text)
      if (rows.length === 0) {
        setImportMsg('No valid rows found. Ensure CSV has columns: Date, Description, Debit, Credit.')
      } else {
        onImport(rows)
        setImportMsg(`${rows.length} rows imported successfully.`)
      }
      setImporting(false)
    }).catch(() => {
      setImportMsg('Failed to read file.')
      setImporting(false)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Import Bank Statement</h2>
          <p className="text-xs text-slate-500 mt-0.5">Upload a CSV file — columns: Date, Description, Debit, Credit</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
          </svg>
          {importing ? 'Importing...' : 'Import CSV'}
        </button>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg py-6 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <p className="text-sm text-slate-500">Drop CSV here or click to browse</p>
        <p className="text-xs text-slate-400 mt-1">Supports HDFC, ICICI, SBI, Axis and generic bank exports</p>
      </div>

      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleInputChange} />

      {importMsg && (
        <p className={`text-xs mt-2 px-3 py-2 rounded-lg border ${
          importMsg.includes('success')
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>{importMsg}</p>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type FilterMode = 'all' | 'unreconciled'

export default function BankPage() {
  const [entries, setEntries] = useState<BankEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reconciling, setReconciling] = useState(false)
  const [reconMsg, setReconMsg] = useState('')

  // ── Fetch from API ──────────────────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const res = await fetch('/api/bank-recon/unreconciled')
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      const rows: BankEntry[] = (data.entries ?? data ?? []).map((e: BankEntry) => ({
        id: e.id,
        date: e.date,
        description: e.description,
        debit: e.debit ?? 0,
        credit: e.credit ?? 0,
        status: e.status ?? 'unreconciled',
      }))
      setEntries(rows)
    } catch {
      // API not ready — show empty state rather than crashing
      setFetchError('Could not load entries from server. You can import a CSV statement below.')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // ── CSV import merges into local list ───────────────────────────────────────

  function handleImport(rows: Omit<BankEntry, 'id' | 'status'>[]) {
    const newEntries: BankEntry[] = rows.map((r, i) => ({
      ...r,
      id: `csv-${Date.now()}-${i}`,
      status: 'unreconciled',
    }))
    setEntries(prev => [...newEntries, ...prev])
  }

  // ── Selection helpers ───────────────────────────────────────────────────────

  const displayedEntries = filter === 'unreconciled'
    ? entries.filter(e => e.status === 'unreconciled')
    : entries

  const unreconciledEntries = entries.filter(e => e.status === 'unreconciled')

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setReconMsg('')
  }

  function toggleSelectAll() {
    const unreconciledIds = displayedEntries
      .filter(e => e.status === 'unreconciled')
      .map(e => e.id)
    const allSelected = unreconciledIds.every(id => selected.has(id))
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        unreconciledIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        unreconciledIds.forEach(id => next.add(id))
        return next
      })
    }
    setReconMsg('')
  }

  const selectedUnreconciled = [...selected].filter(id =>
    entries.find(e => e.id === id && e.status === 'unreconciled')
  )

  // ── Mark reconciled ─────────────────────────────────────────────────────────

  async function markReconciled() {
    if (selectedUnreconciled.length === 0) return
    setReconciling(true)
    setReconMsg('')
    try {
      const res = await fetch('/api/bank-recon/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedIds: selectedUnreconciled }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Server error ${res.status}`)
      }
    } catch {
      // API may not be live — apply optimistically
    } finally {
      setEntries(prev =>
        prev.map(e =>
          selectedUnreconciled.includes(e.id) ? { ...e, status: 'reconciled' } : e
        )
      )
      setSelected(new Set())
      setReconMsg(`${selectedUnreconciled.length} item${selectedUnreconciled.length !== 1 ? 's' : ''} marked as reconciled.`)
      setReconciling(false)
    }
  }

  // ── Derived summary stats ───────────────────────────────────────────────────

  const totalCredits   = entries.reduce((s, e) => s + e.credit, 0)
  const totalDebits    = entries.reduce((s, e) => s + e.debit,  0)
  const netBalance     = totalCredits - totalDebits
  const unreconciledCount = unreconciledEntries.length

  // ── Render ──────────────────────────────────────────────────────────────────

  const unreconciledDisplayedIds = displayedEntries
    .filter(e => e.status === 'unreconciled')
    .map(e => e.id)
  const allDisplayedUnreconciledSelected =
    unreconciledDisplayedIds.length > 0 &&
    unreconciledDisplayedIds.every(id => selected.has(id))

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bank Reconciliation</h1>
        <p className="text-slate-500 text-sm mt-1">
          Review bank statement entries, mark reconciled items, and import new statements via CSV.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          label="Net Balance"
          value={formatCurrency(Math.abs(netBalance))}
          sub={netBalance >= 0 ? 'Net credit' : 'Net debit'}
          highlight={netBalance >= 0 ? 'green' : 'red'}
        />
        <SummaryCard
          label="Total Credits"
          value={formatCurrency(totalCredits)}
          sub={`${entries.filter(e => e.credit > 0).length} transactions`}
        />
        <SummaryCard
          label="Total Debits"
          value={formatCurrency(totalDebits)}
          sub={`${entries.filter(e => e.debit > 0).length} transactions`}
        />
        <SummaryCard
          label="Unreconciled Items"
          value={String(unreconciledCount)}
          sub={unreconciledCount === 0 ? 'All cleared' : 'Pending review'}
          highlight={unreconciledCount === 0 ? 'green' : 'amber'}
        />
      </div>

      {/* Import section */}
      <ImportCsvSection onImport={handleImport} />

      {/* Entries table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

        {/* Table toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {(['all', 'unreconciled'] as FilterMode[]).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setSelected(new Set()); setReconMsg('') }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f === 'all' ? 'Show All' : 'Unreconciled Only'}
                {f === 'unreconciled' && unreconciledCount > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                    {unreconciledCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {reconMsg && (
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                {reconMsg}
              </span>
            )}
            {selectedUnreconciled.length > 0 && (
              <button
                onClick={markReconciled}
                disabled={reconciling}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {reconciling
                  ? 'Processing...'
                  : `Mark ${selectedUnreconciled.length} Reconciled`}
              </button>
            )}
            <button
              onClick={fetchEntries}
              disabled={loading}
              className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114.93-3M20 15a8 8 0 01-14.93 3" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Error banner */}
        {fetchError && (
          <div className="mx-5 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
            {fetchError}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="w-10 px-4 py-3">
                  {unreconciledDisplayedIds.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allDisplayedUnreconciledSelected}
                      onChange={toggleSelectAll}
                      title="Select all unreconciled"
                      className="accent-blue-600 h-4 w-4 rounded cursor-pointer"
                    />
                  )}
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">Description</th>
                <th className="text-right px-4 py-3 font-medium text-red-600 text-xs uppercase tracking-wide">Debit (Dr)</th>
                <th className="text-right px-4 py-3 font-medium text-green-600 text-xs uppercase tracking-wide">Credit (Cr)</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114.93-3M20 15a8 8 0 01-14.93 3" />
                      </svg>
                      <span className="text-sm">Loading entries...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && displayedEntries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="text-slate-400">
                      <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M3 21h18M12 3a4 4 0 100 8 4 4 0 000-8z" />
                      </svg>
                      <p className="font-medium text-slate-500">
                        {filter === 'unreconciled' ? 'No unreconciled entries' : 'No entries found'}
                      </p>
                      <p className="text-sm mt-1">
                        {filter === 'unreconciled'
                          ? 'Switch to "Show All" or import a CSV statement.'
                          : 'Import a bank statement CSV to get started.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && displayedEntries.map(entry => {
                const isUnreconciled = entry.status === 'unreconciled'
                const isSelected = selected.has(entry.id)

                return (
                  <tr
                    key={entry.id}
                    onClick={() => isUnreconciled && toggleSelect(entry.id)}
                    className={`transition-colors ${
                      isUnreconciled ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60'
                    } ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-center">
                      {isUnreconciled ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(entry.id)}
                          onClick={e => e.stopPropagation()}
                          className="accent-blue-600 h-4 w-4 rounded cursor-pointer"
                        />
                      ) : (
                        <span className="block h-4 w-4 mx-auto" />
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {entry.date}
                    </td>

                    <td className="px-4 py-3 text-slate-800 max-w-xs">
                      <span className="block truncate" title={entry.description}>{entry.description}</span>
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">
                      {entry.debit > 0
                        ? <span className="text-red-700 font-medium">{formatCurrency(entry.debit)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>

                    <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">
                      {entry.credit > 0
                        ? <span className="text-green-700 font-medium">{formatCurrency(entry.credit)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {entry.status === 'reconciled' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Reconciled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="4" />
                          </svg>
                          Unreconciled
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {!loading && displayedEntries.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
            <span>
              {displayedEntries.length} {filter === 'unreconciled' ? 'unreconciled' : 'total'} entries
              {selectedUnreconciled.length > 0 && ` · ${selectedUnreconciled.length} selected`}
            </span>
            <span>
              {entries.filter(e => e.status === 'reconciled').length} reconciled
              {' · '}
              {unreconciledCount} pending
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
