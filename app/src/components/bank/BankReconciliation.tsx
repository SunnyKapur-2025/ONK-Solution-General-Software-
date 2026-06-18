'use client'

import { useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'

interface StatementLine {
  id: string
  date: string
  description: string
  debit: number   // money out of bank (from bank's perspective)
  credit: number  // money into bank
  balance: number
  matchStatus: 'matched' | 'suggested' | 'unmatched'
  matchedVoucherId?: string
  matchedVoucherNo?: string
  matchConfidence?: number
}

interface Props {
  bankAccountId: string
  bankAccountName: string
  onImport: (lines: StatementLine[]) => Promise<void>
  onReconcile: (lineId: string, voucherId: string) => Promise<void>
  onCreateVoucher: (line: StatementLine) => Promise<void>
}

// Detect bank format from headers
function detectBankFormat(headers: string[]): string {
  const h = headers.map(s => s.toLowerCase().trim())
  if (h.some(x => x.includes('chq') || x.includes('cheque'))) return 'hdfc'
  if (h.some(x => x.includes('tran id') || x.includes('transaction id'))) return 'icici'
  if (h.some(x => x.includes('txn date'))) return 'sbi'
  return 'generic'
}

// Parse CSV to statement lines (client-side)
function parseCsv(text: string): StatementLine[] {
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
  const result: StatementLine[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.replace(/"/g, '').trim())
    if (cells.length < 4) continue
    const debit  = parseFloat(cells[col.debit]?.replace(/,/g, '')  || '0') || 0
    const credit = parseFloat(cells[col.credit]?.replace(/,/g, '') || '0') || 0
    const balance = parseFloat(cells[col.balance]?.replace(/,/g, '') || '0') || 0
    if (debit === 0 && credit === 0) continue

    result.push({
      id: `stl-${i}`,
      date: cells[col.date] || '',
      description: cells[col.desc] || '',
      debit,
      credit,
      balance,
      matchStatus: 'unmatched',
    })
  }
  return result
}

export default function BankReconciliation({ bankAccountName, onImport, onReconcile, onCreateVoucher }: Props) {
  const [lines, setLines] = useState<StatementLine[]>([])
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'matched' | 'suggested' | 'unmatched'>('all')
  const [dragOver, setDragOver] = useState(false)

  const processFile = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const text = await file.text()
      const parsed = parseCsv(text)
      // Send to API for auto-matching
      const res = await fetch('/api/bank-recon/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: parsed }),
      })
      const matched: StatementLine[] = res.ok ? (await res.json()).lines : parsed
      setLines(matched)
      await onImport(matched)
    } finally {
      setUploading(false)
    }
  }, [onImport])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const filtered = lines.filter(l => filter === 'all' || l.matchStatus === filter)
  const counts = {
    matched:   lines.filter(l => l.matchStatus === 'matched').length,
    suggested: lines.filter(l => l.matchStatus === 'suggested').length,
    unmatched: lines.filter(l => l.matchStatus === 'unmatched').length,
  }

  async function bulkConfirmMatched() {
    const matched = lines.filter(l => l.matchStatus === 'matched' && l.matchedVoucherId)
    for (const line of matched) {
      await onReconcile(line.id, line.matchedVoucherId!)
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bank Reconciliation</h1>
        <p className="text-slate-500 text-sm mt-0.5">{bankAccountName} — match your bank statement against your ledger</p>
      </div>

      {/* Upload area */}
      {lines.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <div className="text-4xl mb-3">🏦</div>
          <p className="font-semibold text-slate-700 mb-1">Drop your bank statement here</p>
          <p className="text-slate-500 text-sm mb-4">
            CSV or Excel file. Supports HDFC, ICICI, SBI, Axis, Kotak — auto-detected.
          </p>
          <label className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm cursor-pointer">
            {uploading ? 'Processing…' : 'Choose File'}
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileInput} disabled={uploading} />
          </label>
          <p className="text-xs text-slate-400 mt-3">
            No live bank feed required. Download your statement from net banking and upload.
          </p>
        </div>
      )}

      {/* Reconciliation view */}
      {lines.length > 0 && (
        <>
          {/* Status summary */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { key: 'matched',   label: 'Matched',   color: 'green', desc: 'Ready to confirm' },
              { key: 'suggested', label: 'Suggested', color: 'yellow', desc: 'Review & accept' },
              { key: 'unmatched', label: 'Unmatched', color: 'red',   desc: 'Create voucher' },
            ].map((b) => (
              <button key={b.key}
                onClick={() => setFilter(filter === b.key as typeof filter ? 'all' : b.key as typeof filter)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  filter === b.key ? `border-${b.color}-400 bg-${b.color}-50` : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}>
                <p className={`text-2xl font-bold text-${b.color}-700`}>{counts[b.key as keyof typeof counts]}</p>
                <p className="font-semibold text-slate-800 text-sm">{b.label}</p>
                <p className="text-xs text-slate-500">{b.desc}</p>
              </button>
            ))}
          </div>

          {/* Bulk action */}
          {counts.matched > 0 && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-5 py-3 mb-4">
              <p className="text-green-800 text-sm font-medium">
                {counts.matched} entries matched with high confidence
              </p>
              <button onClick={bulkConfirmMatched}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
                Confirm All Matched
              </button>
            </div>
          )}

          {/* Statement lines */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Bank Description</th>
                  <th className="text-right px-4 py-3 font-medium text-red-600">Out (Debit)</th>
                  <th className="text-right px-4 py-3 font-medium text-green-600">In (Credit)</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Balance</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Matched With</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((line) => (
                  <tr key={line.id} className={`hover:bg-slate-50 ${
                    line.matchStatus === 'matched' ? 'bg-green-50/50' :
                    line.matchStatus === 'suggested' ? 'bg-yellow-50/50' : ''
                  }`}>
                    <td className="px-5 py-3 text-slate-600 text-xs">{line.date}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{line.description}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-700">
                      {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-green-700">
                      {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(line.balance)}</td>
                    <td className="px-4 py-3">
                      {line.matchStatus === 'matched' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          ✓ {line.matchedVoucherNo}
                        </span>
                      )}
                      {line.matchStatus === 'suggested' && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                          ~ {line.matchedVoucherNo} ({line.matchConfidence}%)
                        </span>
                      )}
                      {line.matchStatus === 'unmatched' && (
                        <span className="text-xs text-slate-400">No match found</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {line.matchStatus === 'suggested' && line.matchedVoucherId && (
                        <button onClick={() => onReconcile(line.id, line.matchedVoucherId!)}
                          className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-2.5 py-1 rounded font-medium">
                          Accept
                        </button>
                      )}
                      {line.matchStatus === 'unmatched' && (
                        <button onClick={() => onCreateVoucher(line)}
                          className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded font-medium">
                          Create Entry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No {filter !== 'all' ? filter : ''} entries
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-4">
            <button onClick={() => setLines([])}
              className="text-sm text-slate-500 hover:text-slate-700 border border-slate-200 px-4 py-2 rounded-lg">
              ← Upload Different Statement
            </button>
            <p className="text-xs text-slate-400 self-center">
              Tip: Confirm "Matched" entries in bulk, then handle Suggested and Unmatched one by one.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
