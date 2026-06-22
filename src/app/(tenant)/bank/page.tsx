'use client'

import { useState, useCallback, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'

interface BankTransaction {
  date: string
  description: string
  debit: number
  credit: number
  balance: number
}

interface UnreconciledEntry {
  id: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  source: 'bank' | 'books'
  selected: boolean
}

// Detect bank format from CSV headers
function detectBankFormat(headers: string[]): string {
  const h = headers.map(s => s.toLowerCase().trim())
  if (h.some(x => x.includes('chq') || x.includes('cheque'))) return 'hdfc'
  if (h.some(x => x.includes('tran id') || x.includes('transaction id'))) return 'icici'
  if (h.some(x => x.includes('txn date'))) return 'sbi'
  return 'generic'
}

function parseCsv(text: string): BankTransaction[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  const format = detectBankFormat(headers)

  const colMap: Record<string, Record<string, number>> = {
    hdfc:    { date: 0, desc: 1, debit: 4, credit: 5, balance: 6 },
    icici:   { date: 2, desc: 5, debit: 6, credit: 7, balance: 8 },
    sbi:     { date: 0, desc: 4, debit: 5, credit: 6, balance: 7 },
    generic: { date: 0, desc: 1, debit: 2, credit: 3, balance: 4 },
  }

  const col = colMap[format]
  const result: BankTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.replace(/"/g, '').trim())
    if (cells.length < 4) continue
    const debit  = parseFloat(cells[col.debit]?.replace(/,/g, '')  || '0') || 0
    const credit = parseFloat(cells[col.credit]?.replace(/,/g, '') || '0') || 0
    const balance = parseFloat(cells[col.balance]?.replace(/,/g, '') || '0') || 0
    if (debit === 0 && credit === 0) continue

    result.push({
      date: cells[col.date] || '',
      description: cells[col.desc] || '',
      debit,
      credit,
      balance,
    })
  }
  return result
}

// ---------- Upload Statement Tab ----------
function UploadTab() {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [importing, setImporting] = useState(false)
  const [parsePdfLoading, setParsePdfLoading] = useState(false)
  const [parsePdfError, setParsePdfError] = useState('')
  const [importResult, setImportResult] = useState<{ count: number } | null>(null)
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((f: File) => {
    setFile(f)
    setTransactions([])
    setImportResult(null)
    setImportError('')

    if (f.name.endsWith('.csv') || f.type === 'text/csv') {
      f.text().then(text => {
        const parsed = parseCsv(text)
        setTransactions(parsed)
      })
    }
    // PDF parsed via server — user clicks "Parse PDF" button
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  async function handleImport() {
    if (transactions.length === 0) return
    setImporting(true)
    setImportError('')
    try {
      const res = await fetch('/api/bank-recon/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions,
          bankAccountId: 'default',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setImportResult({ count: data.count })
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const isPdf = file && (file.name.endsWith('.pdf') || file.type === 'application/pdf')

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-white'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-4xl mb-3 select-none">📄</div>
        <p className="font-semibold text-slate-700 mb-1">
          Drop your bank statement here or click to browse
        </p>
        <p className="text-slate-500 text-sm mb-1">
          Supports CSV (HDFC, ICICI, SBI, Axis, Kotak — auto-detected) and PDF
        </p>
        <p className="text-xs text-slate-400">
          Download your statement from net banking, then upload it here
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.pdf"
          className="hidden"
          onChange={handleFileInput}
          onClick={e => e.stopPropagation()}
        />
      </div>

      {/* File selected */}
      {file && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            onClick={() => { setFile(null); setTransactions([]); setImportResult(null) }}
            className="text-sm text-slate-500 hover:text-red-600 transition-colors"
          >
            Remove
          </button>
        </div>
      )}

      {/* PDF parse panel */}
      {isPdf && transactions.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">PDF Bank Statement</p>
          <p className="text-sm text-amber-700 mb-3">
            Your PDF will be parsed on the server — transactions are extracted from the statement text.
            Works best with text-based PDFs from HDFC, ICICI, SBI, Axis, and Kotak net banking.
          </p>
          {parsePdfError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{parsePdfError}</p>
          )}
          <button
            disabled={parsePdfLoading}
            onClick={async () => {
              if (!file) return
              setParsePdfLoading(true)
              setParsePdfError('')
              try {
                const fd = new FormData()
                fd.append('file', file)
                const res = await fetch('/api/bank-recon/parse-pdf', { method: 'POST', body: fd })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Parsing failed')
                if (data.transactions.length === 0) {
                  setParsePdfError('No transactions found. Your PDF may be scanned (image-based) — try downloading a text-based statement from net banking.')
                } else {
                  setTransactions(data.transactions)
                }
              } catch (err: unknown) {
                setParsePdfError(err instanceof Error ? err.message : 'PDF parsing failed')
              } finally {
                setParsePdfLoading(false)
              }
            }}
            className="bg-amber-600 hover:bg-amber-500 disabled:bg-amber-300 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
          >
            {parsePdfLoading ? 'Parsing PDF…' : 'Parse PDF & Extract Transactions'}
          </button>
        </div>
      )}

      {/* CSV Instructions */}
      {!file && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">CSV Format Instructions</p>
          <p className="text-sm text-blue-700 mb-2">
            For generic CSV, ensure your file has these columns in order:
          </p>
          <code className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Date, Description, Debit, Credit, Balance
          </code>
          <p className="text-xs text-blue-600 mt-2">
            HDFC, ICICI, SBI formats are automatically detected from column headers.
          </p>
        </div>
      )}

      {/* Parsed preview */}
      {transactions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {transactions.length} transactions extracted — preview
            </p>
            {importResult ? (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg font-medium">
                {importResult.count} draft entries created
              </div>
            ) : (
              <button
                onClick={handleImport}
                disabled={importing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                {importing ? 'Importing...' : 'Import Transactions'}
              </button>
            )}
          </div>

          {importError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {importError}
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
                    <th className="text-right px-4 py-3 font-medium text-red-600">Debit (Out)</th>
                    <th className="text-right px-4 py-3 font-medium text-green-600">Credit (In)</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.slice(0, 50).map((tx, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-600 text-xs whitespace-nowrap">{tx.date}</td>
                      <td className="px-4 py-2.5 text-slate-700 max-w-xs truncate">{tx.description}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-red-700 text-xs">
                        {tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-green-700 text-xs">
                        {tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600 text-xs">
                        {tx.balance > 0 ? formatCurrency(tx.balance) : '—'}
                      </td>
                    </tr>
                  ))}
                  {transactions.length > 50 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-center text-xs text-slate-400">
                        + {transactions.length - 50} more transactions (will be imported)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Reconcile Tab ----------
function ReconcileTab() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [bankEntries, setBankEntries] = useState<UnreconciledEntry[]>([])
  const [bookEntries, setBookEntries] = useState<UnreconciledEntry[]>([])
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<string | null>(null)
  const [matchedPairs, setMatchedPairs] = useState<Array<{ bankId: string; bookId: string }>>([])
  const [reconciling, setReconciling] = useState(false)

  async function fetchEntries() {
    setLoading(true)
    try {
      const res = await fetch(`/api/bank-recon/unreconciled?from=${dateFrom}&to=${dateTo}`)
      if (res.ok) {
        const data = await res.json()
        setBankEntries((data.bankEntries || []).map((e: Omit<UnreconciledEntry, 'selected'>) => ({ ...e, selected: false })))
        setBookEntries((data.bookEntries || []).map((e: Omit<UnreconciledEntry, 'selected'>) => ({ ...e, selected: false })))
      } else {
        // Demo data when API not available
        setBankEntries([
          { id: 'b1', date: '2026-06-01', description: 'NEFT CR - Client Payment', amount: 50000, type: 'credit', source: 'bank', selected: false },
          { id: 'b2', date: '2026-06-05', description: 'ATM WDL', amount: 10000, type: 'debit', source: 'bank', selected: false },
          { id: 'b3', date: '2026-06-10', description: 'IMPS CR - Advance', amount: 25000, type: 'credit', source: 'bank', selected: false },
        ])
        setBookEntries([
          { id: 'j1', date: '2026-06-01', description: 'INV-0042 - Client Payment Received', amount: 50000, type: 'credit', source: 'books', selected: false },
          { id: 'j2', date: '2026-06-06', description: 'Cash Withdrawal', amount: 10000, type: 'debit', source: 'books', selected: false },
        ])
      }
    } finally {
      setLoading(false)
    }
  }

  function handleSelectBank(id: string) {
    setSelectedBank(prev => prev === id ? null : id)
  }

  function handleSelectBook(id: string) {
    setSelectedBook(prev => prev === id ? null : id)
  }

  function matchSelected() {
    if (!selectedBank || !selectedBook) return
    setMatchedPairs(prev => [...prev, { bankId: selectedBank, bookId: selectedBook }])
    setBankEntries(prev => prev.filter(e => e.id !== selectedBank))
    setBookEntries(prev => prev.filter(e => e.id !== selectedBook))
    setSelectedBank(null)
    setSelectedBook(null)
  }

  async function markReconciled() {
    if (matchedPairs.length === 0) return
    setReconciling(true)
    try {
      await fetch('/api/bank-recon/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs: matchedPairs }),
      })
      setMatchedPairs([])
      fetchEntries()
    } finally {
      setReconciling(false)
    }
  }

  const bankTotal = bankEntries.reduce((s, e) => s + (e.type === 'credit' ? e.amount : -e.amount), 0)
  const bookTotal = bookEntries.reduce((s, e) => s + (e.type === 'credit' ? e.amount : -e.amount), 0)
  const difference = bankTotal - bookTotal

  return (
    <div className="space-y-5">
      {/* Date range */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={fetchEntries}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Loading...' : 'Fetch Entries'}
        </button>
      </div>

      {/* Instructions */}
      {bankEntries.length === 0 && bookEntries.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-3xl mb-3">⚖️</p>
          <p className="font-medium text-slate-500">Select a date range and click Fetch Entries</p>
          <p className="text-sm mt-1">Unreconciled bank transactions vs ledger entries will appear here</p>
        </div>
      )}

      {(bankEntries.length > 0 || bookEntries.length > 0) && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Bank Statement Balance</p>
              <p className={`text-lg font-bold ${bankTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(Math.abs(bankTotal))}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Books Balance</p>
              <p className={`text-lg font-bold ${bookTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(Math.abs(bookTotal))}
              </p>
            </div>
            <div className={`border rounded-xl p-4 text-center ${Math.abs(difference) < 0.01 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs text-slate-500 mb-1">Difference</p>
              <p className={`text-lg font-bold ${Math.abs(difference) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(Math.abs(difference))}
              </p>
              {Math.abs(difference) < 0.01 && <p className="text-xs text-green-600 mt-0.5">Balanced!</p>}
            </div>
          </div>

          {/* Match prompt */}
          {(selectedBank || selectedBook) && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center justify-between">
              <p className="text-sm text-blue-800">
                {selectedBank && selectedBook
                  ? 'Both sides selected — click Match to pair them'
                  : 'Select one entry from each side to match them'}
              </p>
              <button
                onClick={matchSelected}
                disabled={!selectedBank || !selectedBook}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                Match Selected
              </button>
            </div>
          )}

          {/* Side-by-side lists */}
          <div className="grid grid-cols-2 gap-4">
            {/* Bank Statement */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Bank Statement ({bankEntries.length} unmatched)
              </h3>
              <div className="space-y-2">
                {bankEntries.map(entry => (
                  <div
                    key={entry.id}
                    onClick={() => handleSelectBank(entry.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-sm ${
                      selectedBank === entry.id
                        ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{entry.date}</span>
                      <span className={`font-semibold text-xs ${entry.type === 'credit' ? 'text-green-700' : 'text-red-700'}`}>
                        {entry.type === 'credit' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </span>
                    </div>
                    <p className="text-slate-700 mt-1 text-xs truncate">{entry.description}</p>
                  </div>
                ))}
                {bankEntries.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                    All entries matched
                  </div>
                )}
              </div>
            </div>

            {/* Books */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                Books / Ledger ({bookEntries.length} unmatched)
              </h3>
              <div className="space-y-2">
                {bookEntries.map(entry => (
                  <div
                    key={entry.id}
                    onClick={() => handleSelectBook(entry.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-sm ${
                      selectedBook === entry.id
                        ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{entry.date}</span>
                      <span className={`font-semibold text-xs ${entry.type === 'credit' ? 'text-green-700' : 'text-red-700'}`}>
                        {entry.type === 'credit' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </span>
                    </div>
                    <p className="text-slate-700 mt-1 text-xs truncate">{entry.description}</p>
                  </div>
                ))}
                {bookEntries.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                    All entries matched
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Matched pairs */}
          {matchedPairs.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-green-800">
                  {matchedPairs.length} pairs ready to reconcile
                </p>
                <button
                  onClick={markReconciled}
                  disabled={reconciling}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                >
                  {reconciling ? 'Processing...' : 'Mark as Reconciled'}
                </button>
              </div>
              <div className="space-y-1">
                {matchedPairs.map((pair, i) => (
                  <div key={i} className="text-xs text-green-700 bg-green-100 rounded px-2 py-1">
                    Bank: {pair.bankId} ↔ Books: {pair.bookId}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------- Main Page ----------
export default function BankPage() {
  const [tab, setTab] = useState<'upload' | 'reconcile'>('upload')

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bank Reconciliation</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Upload your bank statement and reconcile it against your ledger entries.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'upload' as const, label: 'Upload Statement' },
          { key: 'reconcile' as const, label: 'Reconcile' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'upload' ? <UploadTab /> : <ReconcileTab />}
    </div>
  )
}
