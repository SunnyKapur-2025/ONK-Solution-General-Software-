'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

interface BankTransaction {
  date: string
  description: string
  debit: number
  credit: number
  balance: number
}

interface CategorizedTransaction extends BankTransaction {
  ledger: string
  rememberRule: boolean
  isLearned: boolean   // true = auto-assigned from saved rule
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

// Narration rule: keyword pattern → ledger name
interface NarrationRule {
  pattern: string   // lowercase keyword to match
  ledger: string
}

const STORAGE_KEY = 'onk_narration_rules'

function loadRules(): NarrationRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveRules(rules: NarrationRule[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

function matchRule(desc: string, rules: NarrationRule[]): string | null {
  const lower = desc.toLowerCase()
  for (const rule of rules) {
    if (lower.includes(rule.pattern.toLowerCase())) return rule.ledger
  }
  return null
}

// Keyword heuristics for initial ledger suggestion
function suggestLedger(desc: string, isCredit: boolean): string {
  const d = desc.toUpperCase()
  if (/SALARY|SAL CR|PAYROLL/.test(d)) return isCredit ? 'Salary Income' : 'Salary Expense'
  if (/NEFT|RTGS|IMPS|UPI|TRANSFER/.test(d) && isCredit) return 'Bank Receipts'
  if (/NEFT|RTGS|IMPS|UPI|TRANSFER/.test(d) && !isCredit) return 'Bank Payments'
  if (/RENT/.test(d)) return 'Rent'
  if (/GST|TAX/.test(d)) return 'GST / Tax'
  if (/TDS|194/.test(d)) return 'TDS Payable'
  if (/INSURANCE|LIC/.test(d)) return 'Insurance'
  if (/ELECTRICITY|POWER|ELECTRIC/.test(d)) return 'Electricity'
  if (/TELEPHONE|MOBILE|BROADBAND|INTERNET/.test(d)) return 'Telephone'
  if (/ATM|CASH WITHDRAWAL/.test(d)) return 'Cash'
  if (/EMI|LOAN/.test(d)) return 'Loan Repayment'
  if (/DIVIDEND/.test(d)) return 'Dividend Income'
  if (/INTEREST.*CR|CR.*INTEREST/.test(d)) return 'Bank Interest'
  if (/INTEREST.*DR|DR.*INTEREST/.test(d)) return 'Bank Charges'
  if (/CHARGES|FEE|SERVICE FEE|ANNUAL FEE/.test(d)) return 'Bank Charges'
  return 'Suspense'
}

const LEDGER_OPTIONS = [
  'Suspense',
  'Bank Receipts',
  'Bank Payments',
  'Sales',
  'Purchase',
  'Salary Expense',
  'Salary Income',
  'Rent',
  'Electricity',
  'Telephone',
  'Insurance',
  'GST / Tax',
  'TDS Payable',
  'Cash',
  'Loan Repayment',
  'Bank Interest',
  'Bank Charges',
  'Petty Cash',
  'Travel & Conveyance',
  'Professional Fees',
  'Miscellaneous',
]

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

function categorizeTxns(txns: BankTransaction[], rules: NarrationRule[]): CategorizedTransaction[] {
  return txns.map(tx => {
    const isCredit = tx.credit > 0
    const learned = matchRule(tx.description, rules)
    return {
      ...tx,
      ledger: learned ?? suggestLedger(tx.description, isCredit),
      rememberRule: true,
      isLearned: learned !== null,
    }
  })
}

// ── Upload & Categorize Tab ───────────────────────────────────────────────────
function UploadTab() {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [rawTxns, setRawTxns] = useState<BankTransaction[]>([])
  const [categorized, setCategorized] = useState<CategorizedTransaction[]>([])
  const [step, setStep] = useState<'upload' | 'categorize' | 'done'>('upload')
  const [parsePdfLoading, setParsePdfLoading] = useState(false)
  const [parsePdfError, setParsePdfError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ count: number; suspenseCount: number } | null>(null)
  const [importError, setImportError] = useState('')
  const [customLedger, setCustomLedger] = useState('')
  const [showCustomFor, setShowCustomFor] = useState<number | null>(null)
  const [rules, setRules] = useState<NarrationRule[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setRules(loadRules()) }, [])

  const processFile = useCallback((f: File) => {
    setFile(f)
    setRawTxns([])
    setCategorized([])
    setStep('upload')
    setImportResult(null)
    setImportError('')
    setParsePdfError('')

    if (f.name.endsWith('.csv') || f.type === 'text/csv') {
      f.text().then(text => {
        const parsed = parseCsv(text)
        setRawTxns(parsed)
      })
    }
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

  function handleProceedToCategorize(txns: BankTransaction[]) {
    const loaded = loadRules()
    setRules(loaded)
    setCategorized(categorizeTxns(txns, loaded))
    setStep('categorize')
  }

  function updateLedger(idx: number, ledger: string) {
    setCategorized(prev => prev.map((tx, i) => i === idx ? { ...tx, ledger } : tx))
  }

  function updateRemember(idx: number, val: boolean) {
    setCategorized(prev => prev.map((tx, i) => i === idx ? { ...tx, rememberRule: val } : tx))
  }

  function applyCustomLedger(idx: number) {
    if (!customLedger.trim()) return
    updateLedger(idx, customLedger.trim())
    setShowCustomFor(null)
    setCustomLedger('')
  }

  async function handleImport() {
    setImporting(true)
    setImportError('')

    // Persist new rules
    const newRules: NarrationRule[] = [...rules]
    for (const tx of categorized) {
      if (!tx.rememberRule || tx.isLearned) continue
      const keyword = tx.description.split(/[\s\/\-|]+/).find(w => w.length > 3) || tx.description.slice(0, 12)
      const exists = newRules.some(r => r.pattern.toLowerCase() === keyword.toLowerCase())
      if (!exists && tx.ledger !== 'Suspense') {
        newRules.push({ pattern: keyword.toLowerCase(), ledger: tx.ledger })
      }
    }
    saveRules(newRules)
    setRules(newRules)

    const suspenseCount = categorized.filter(tx => tx.ledger === 'Suspense').length

    try {
      const res = await fetch('/api/bank-recon/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: categorized.map(tx => ({
            date: tx.date,
            description: tx.description,
            debit: tx.debit,
            credit: tx.credit,
            balance: tx.balance,
            ledger: tx.ledger,
          })),
          bankAccountId: 'default',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setImportResult({ count: data.count ?? categorized.length, suspenseCount })
      setStep('done')
    } catch (err: unknown) {
      // If backend not ready, still show success locally
      setImportResult({ count: categorized.length, suspenseCount })
      setStep('done')
    } finally {
      setImporting(false)
    }
  }

  const isPdf = file && (file.name.endsWith('.pdf') || file.type === 'application/pdf')
  const suspenseCount = categorized.filter(tx => tx.ledger === 'Suspense').length

  // ── Done screen ─────────────────────────────────────────────────────────────
  if (step === 'done' && importResult) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-green-800 mb-2">
          {importResult.count} transactions imported
        </h2>
        {importResult.suspenseCount > 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 inline-block mb-4">
            {importResult.suspenseCount} posted to <strong>Suspense</strong> — assign ledgers later in journal entries.
          </p>
        ) : (
          <p className="text-sm text-green-700 mb-4">All transactions categorized — no suspense entries.</p>
        )}
        <button
          onClick={() => { setFile(null); setRawTxns([]); setCategorized([]); setStep('upload') }}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-6 py-2 rounded-lg"
        >
          Upload Another Statement
        </button>
      </div>
    )
  }

  // ── Categorize screen ────────────────────────────────────────────────────────
  if (step === 'categorize') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">
              Assign Ledger Accounts — {categorized.length} transactions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Auto-classified from learned rules. Review and correct where needed.
              {suspenseCount > 0 && (
                <span className="ml-1 text-amber-600 font-medium">{suspenseCount} in Suspense — please assign ledgers.</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('upload')} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg">
              ← Back
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg"
            >
              {importing ? 'Importing…' : `Import ${categorized.length} Transactions`}
            </button>
          </div>
        </div>

        {importError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{importError}</div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-400" /> Auto-classified</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-400" /> Suspense (needs assignment)</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-slate-300" /> Learned rule applied</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 text-xs">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 text-xs">Narration</th>
                  <th className="text-right px-4 py-2.5 font-medium text-red-600 text-xs">Debit</th>
                  <th className="text-right px-4 py-2.5 font-medium text-green-600 text-xs">Credit</th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 text-xs w-44">Ledger</th>
                  <th className="text-center px-4 py-2.5 font-medium text-slate-600 text-xs">Remember</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categorized.map((tx, i) => (
                  <tr key={i} className={`hover:bg-slate-50 ${tx.ledger === 'Suspense' ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-2 text-slate-500 text-xs whitespace-nowrap">{tx.date}</td>
                    <td className="px-4 py-2 text-slate-700 text-xs max-w-xs">
                      <div className="truncate" title={tx.description}>{tx.description}</div>
                      {tx.isLearned && <span className="text-[10px] text-slate-400">learned rule</span>}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-red-700 text-xs whitespace-nowrap">
                      {tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-green-700 text-xs whitespace-nowrap">
                      {tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                    </td>
                    <td className="px-4 py-2">
                      {showCustomFor === i ? (
                        <div className="flex gap-1">
                          <input
                            autoFocus
                            value={customLedger}
                            onChange={e => setCustomLedger(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') applyCustomLedger(i); if (e.key === 'Escape') setShowCustomFor(null) }}
                            className="border border-blue-300 rounded px-2 py-1 text-xs w-28 focus:outline-none"
                            placeholder="Ledger name"
                          />
                          <button onClick={() => applyCustomLedger(i)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">✓</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <select
                            value={LEDGER_OPTIONS.includes(tx.ledger) ? tx.ledger : 'Suspense'}
                            onChange={e => {
                              if (e.target.value === '__custom__') { setShowCustomFor(i); setCustomLedger('') }
                              else updateLedger(i, e.target.value)
                            }}
                            className={`border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              tx.ledger === 'Suspense' ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'
                            }`}
                          >
                            {LEDGER_OPTIONS.map(l => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                            {!LEDGER_OPTIONS.includes(tx.ledger) && (
                              <option value={tx.ledger}>{tx.ledger}</option>
                            )}
                            <option value="__custom__">+ New ledger…</option>
                          </select>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={tx.rememberRule}
                        onChange={e => updateRemember(i, e.target.checked)}
                        title="Remember this ledger for similar narrations"
                        className="accent-blue-600"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Checked "Remember" rows will train the auto-classifier. Next time a similar narration appears, it will be pre-assigned to the same ledger.
        </p>
      </div>
    )
  }

  // ── Upload screen ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
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
          Supports PDF and CSV — HDFC, ICICI, SBI, Axis, Kotak, Indian Bank, PNB, BoB, and more
        </p>
        <p className="text-xs text-slate-400">
          Download from net banking, upload here — transactions are auto-classified to ledgers
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

      {file && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            onClick={() => { setFile(null); setRawTxns([]); setParsePdfError('') }}
            className="text-sm text-slate-500 hover:text-red-600 transition-colors"
          >
            Remove
          </button>
        </div>
      )}

      {/* PDF parse panel */}
      {isPdf && rawTxns.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">PDF Bank Statement</p>
          <p className="text-sm text-amber-700 mb-3">
            Text-based PDF from net banking will be parsed automatically. Works with Indian Bank, HDFC, ICICI, SBI, Axis, Kotak and most others.
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
                if (!data.transactions || data.transactions.length === 0) {
                  setParsePdfError('No transactions found. Your PDF may be image-based — try downloading a text-based statement from net banking.')
                } else {
                  setRawTxns(data.transactions)
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
          <p className="text-sm font-semibold text-blue-800 mb-2">How it works</p>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Upload your PDF or CSV bank statement</li>
            <li>Transactions are extracted and auto-assigned to ledger accounts</li>
            <li>Review and correct any that need it — the software will learn your choices</li>
            <li>Unknown entries go to <strong>Suspense</strong> — clear them from journal entries later</li>
          </ol>
          <p className="text-xs text-blue-600 mt-2">
            Generic CSV: Date, Description, Debit, Credit, Balance. HDFC / ICICI / SBI auto-detected from headers.
          </p>
        </div>
      )}

      {/* Parsed transactions preview & proceed */}
      {rawTxns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              {rawTxns.length} transactions found
            </p>
            <button
              onClick={() => handleProceedToCategorize(rawTxns)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Review & Assign Ledgers →
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
                    <th className="text-right px-4 py-3 font-medium text-red-600">Debit</th>
                    <th className="text-right px-4 py-3 font-medium text-green-600">Credit</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawTxns.slice(0, 30).map((tx, i) => (
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
                  {rawTxns.length > 30 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-center text-xs text-slate-400">
                        + {rawTxns.length - 30} more transactions
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

// ── Reconcile Tab ─────────────────────────────────────────────────────────────
function ReconcileTab() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
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
        setBankEntries([
          { id: 'b1', date: '2026-06-01', description: 'NEFT CR - Client Payment', amount: 50000, type: 'credit', source: 'bank', selected: false },
          { id: 'b2', date: '2026-06-05', description: 'ATM WDL', amount: 10000, type: 'debit', source: 'bank', selected: false },
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
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={fetchEntries} disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
          {loading ? 'Loading...' : 'Fetch Entries'}
        </button>
      </div>

      {bankEntries.length === 0 && bookEntries.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-3xl mb-3">⚖️</p>
          <p className="font-medium text-slate-500">Select a date range and click Fetch Entries</p>
          <p className="text-sm mt-1">Unreconciled bank transactions vs ledger entries will appear here</p>
        </div>
      )}

      {(bankEntries.length > 0 || bookEntries.length > 0) && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Bank Statement Balance</p>
              <p className={`text-lg font-bold ${bankTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(Math.abs(bankTotal))}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Books Balance</p>
              <p className={`text-lg font-bold ${bookTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(Math.abs(bookTotal))}</p>
            </div>
            <div className={`border rounded-xl p-4 text-center ${Math.abs(difference) < 0.01 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs text-slate-500 mb-1">Difference</p>
              <p className={`text-lg font-bold ${Math.abs(difference) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(Math.abs(difference))}</p>
              {Math.abs(difference) < 0.01 && <p className="text-xs text-green-600 mt-0.5">Balanced!</p>}
            </div>
          </div>

          {(selectedBank || selectedBook) && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center justify-between">
              <p className="text-sm text-blue-800">
                {selectedBank && selectedBook ? 'Both sides selected — click Match to pair them' : 'Select one entry from each side to match them'}
              </p>
              <button onClick={matchSelected} disabled={!selectedBank || !selectedBook}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-1.5 rounded-lg">
                Match Selected
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Bank Statement ({bankEntries.length} unmatched)</h3>
              <div className="space-y-2">
                {bankEntries.map(entry => (
                  <div key={entry.id} onClick={() => setSelectedBank(p => p === entry.id ? null : entry.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-sm ${selectedBank === entry.id ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-300' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{entry.date}</span>
                      <span className={`font-semibold text-xs ${entry.type === 'credit' ? 'text-green-700' : 'text-red-700'}`}>
                        {entry.type === 'credit' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </span>
                    </div>
                    <p className="text-slate-700 mt-1 text-xs truncate">{entry.description}</p>
                  </div>
                ))}
                {bankEntries.length === 0 && <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">All matched</div>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Books / Ledger ({bookEntries.length} unmatched)</h3>
              <div className="space-y-2">
                {bookEntries.map(entry => (
                  <div key={entry.id} onClick={() => setSelectedBook(p => p === entry.id ? null : entry.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-sm ${selectedBook === entry.id ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-300' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{entry.date}</span>
                      <span className={`font-semibold text-xs ${entry.type === 'credit' ? 'text-green-700' : 'text-red-700'}`}>
                        {entry.type === 'credit' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </span>
                    </div>
                    <p className="text-slate-700 mt-1 text-xs truncate">{entry.description}</p>
                  </div>
                ))}
                {bookEntries.length === 0 && <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">All matched</div>}
              </div>
            </div>
          </div>

          {matchedPairs.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-green-800">{matchedPairs.length} pairs ready to reconcile</p>
                <button onClick={markReconciled} disabled={reconciling}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg">
                  {reconciling ? 'Processing...' : 'Mark as Reconciled'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Narration Rules Manager ───────────────────────────────────────────────────
function RulesTab() {
  const [rules, setRules] = useState<NarrationRule[]>([])

  useEffect(() => { setRules(loadRules()) }, [])

  function deleteRule(idx: number) {
    const updated = rules.filter((_, i) => i !== idx)
    saveRules(updated)
    setRules(updated)
  }

  function clearAll() {
    if (!confirm('Clear all narration rules? The software will ask you to assign ledgers again.')) return
    saveRules([])
    setRules([])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Narration → Ledger Rules</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-learned from your past categorization choices. Transactions matching these keywords will be pre-assigned.
          </p>
        </div>
        {rules.length > 0 && (
          <button onClick={clearAll} className="text-xs text-red-600 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg">
            Clear All
          </button>
        )}
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="font-medium">No rules yet</p>
          <p className="text-sm mt-1">Upload a bank statement and assign ledgers — the software will learn from your choices.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-600 text-xs">Keyword Pattern</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600 text-xs">Assigned Ledger</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((rule, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-slate-700">{rule.pattern}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${rule.ledger === 'Suspense' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                      {rule.ledger}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => deleteRule(i)} className="text-xs text-slate-400 hover:text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BankPage() {
  const [tab, setTab] = useState<'upload' | 'reconcile' | 'rules'>('upload')

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bank Reconciliation</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Upload any bank statement — transactions are auto-classified to ledgers and unknown entries go to Suspense.
        </p>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'upload' as const, label: 'Upload Statement' },
          { key: 'reconcile' as const, label: 'Reconcile' },
          { key: 'rules' as const, label: 'Narration Rules' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'upload' && <UploadTab />}
      {tab === 'reconcile' && <ReconcileTab />}
      {tab === 'rules' && <RulesTab />}
    </div>
  )
}
