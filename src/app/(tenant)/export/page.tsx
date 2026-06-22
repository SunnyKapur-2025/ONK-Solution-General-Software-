'use client'

import { useState, useEffect } from 'react'

interface Account {
  id: string
  name: string
  code: string | null
  type: string | null
  group: string | null
}

export default function ExportPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [format, setFormat] = useState<'tally' | 'busy'>('tally')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Ledger master export state
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [ledgerFormat, setLedgerFormat] = useState<'tally' | 'busy'>('tally')
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerError, setLedgerError] = useState('')
  const [accountsLoading, setAccountsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(data => {
        const accs: Account[] = data.accounts ?? []
        setAccounts(accs)
        setSelectedIds(new Set(accs.map((a: Account) => a.id)))
      })
      .catch(() => setLedgerError('Failed to load accounts'))
      .finally(() => setAccountsLoading(false))
  }, [])

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

  function toggleAccount(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function selectAll()   { setSelectedIds(new Set(accounts.map(a => a.id))) }
  function deselectAll() { setSelectedIds(new Set()) }

  async function handleLedgerExport() {
    if (selectedIds.size === 0) {
      setLedgerError('Select at least one account to export.')
      return
    }
    setLedgerError('')
    setLedgerLoading(true)
    try {
      const ids = [...selectedIds].join(',')
      const res = await fetch(`/api/export/ledgers?format=${ledgerFormat}&ids=${ids}`)
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || 'Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = ledgerFormat === 'tally'
        ? 'ONK_Ledgers_Tally.xml'
        : 'ONK_Ledgers_Busy.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setLedgerError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLedgerLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-6 space-y-10">

      {/* ── Section 1: Voucher Export ── */}
      <div>
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

      {/* ── Section 2: Ledger Master Export ── */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">Export Ledger Masters (Chart of Accounts)</h2>
          <p className="text-slate-500 text-sm mt-1">
            Transfer your ledger setup to Tally or Busy — one click, zero re-entry
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">

          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Export Format</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 'tally', label: 'Tally XML', desc: 'TallyPrime Masters XML — import via Gateway of Tally' },
                { val: 'busy',  label: 'Busy CSV',  desc: 'CSV — import via Busy Masters import' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setLedgerFormat(opt.val as 'tally' | 'busy')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    ledgerFormat === opt.val
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className={`font-semibold text-sm ${ledgerFormat === opt.val ? 'text-blue-800' : 'text-slate-800'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Account list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Accounts ({selectedIds.size} of {accounts.length} selected)
              </label>
              <div className="flex gap-2">
                <button onClick={selectAll}
                  className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg">
                  Select All
                </button>
                <button onClick={deselectAll}
                  className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg">
                  Deselect All
                </button>
              </div>
            </div>

            {accountsLoading ? (
              <div className="py-6 text-center text-slate-400 text-sm">Loading accounts…</div>
            ) : accounts.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-sm">No accounts found.</div>
            ) : (
              <div className="border border-slate-200 rounded-xl max-h-72 overflow-y-auto divide-y divide-slate-100">
                {accounts.map(a => (
                  <label key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(a.id)}
                      onChange={() => toggleAccount(a.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex-1 text-sm text-slate-800">{a.name}</span>
                    {a.code && (
                      <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{a.code}</span>
                    )}
                    {a.type && (
                      <span className="text-xs text-slate-400 capitalize">{a.type}</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {ledgerError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{ledgerError}</p>
          )}

          <button
            onClick={handleLedgerExport}
            disabled={ledgerLoading || selectedIds.size === 0}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
          >
            {ledgerLoading
              ? 'Generating…'
              : `Export ${selectedIds.size} Ledger${selectedIds.size !== 1 ? 's' : ''} as ${ledgerFormat === 'tally' ? 'Tally XML' : 'Busy CSV'}`}
          </button>
        </div>
      </div>

    </div>
  )
}
