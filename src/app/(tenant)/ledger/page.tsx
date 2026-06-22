'use client'

import { useEffect, useState } from 'react'

interface Account {
  id: string
  name: string
  code: string
  type: string
}

interface LedgerLine {
  date: string
  entryNumber: string
  narration: string
  debit: number
  credit: number
  partyName: string
}

interface LedgerData {
  accountName: string
  openingBalance: number
  openingBalanceType: string
  lines: LedgerLine[]
}

function formatAmount(n: number) {
  if (n === 0) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function LedgerPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [from, setFrom] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-04-01`
  })
  const [to, setTo] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [ledger, setLedger] = useState<LedgerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => setAccounts(d.accounts || []))
      .catch(() => setError('Failed to load accounts'))
  }, [])

  const handleShow = async () => {
    if (!accountId) { setError('Please select an account'); return }
    setLoading(true)
    setError('')
    setLedger(null)
    try {
      const res = await fetch(`/api/ledger?accountId=${accountId}&from=${from}&to=${to}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch ledger')
      setLedger(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ledger')
    } finally {
      setLoading(false)
    }
  }

  // Compute running balance
  const rows: { line: LedgerLine; balance: number; balanceType: string }[] = []
  if (ledger) {
    let bal = ledger.openingBalance
    let balType = ledger.openingBalanceType

    for (const line of ledger.lines) {
      const dr = line.debit
      const cr = line.credit
      if (balType === 'Dr') {
        const net = bal + dr - cr
        if (net >= 0) { bal = net; balType = 'Dr' }
        else { bal = Math.abs(net); balType = 'Cr' }
      } else {
        const net = bal + cr - dr
        if (net >= 0) { bal = net; balType = 'Cr' }
        else { bal = Math.abs(net); balType = 'Dr' }
      }
      rows.push({ line, balance: bal, balanceType: balType })
    }
  }

  const closingBalance = rows.length > 0 ? rows[rows.length - 1].balance : ledger?.openingBalance ?? 0
  const closingBalanceType = rows.length > 0 ? rows[rows.length - 1].balanceType : ledger?.openingBalanceType ?? 'Dr'

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ledger</h1>
        <p className="text-sm text-slate-500 mt-1">View transaction history for any account.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Account</label>
            <select
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select account...</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <button
              onClick={handleShow}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : 'Show Ledger'}
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      {ledger && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">{ledger.accountName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{from} to {to}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Entry No</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Narration</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Party</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Debit</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Credit</th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Opening balance row */}
                <tr className="bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 text-xs" colSpan={4}>
                    Opening Balance
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">—</td>
                  <td className="px-4 py-3 text-right text-slate-500">—</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {formatAmount(ledger.openingBalance)} {ledger.openingBalanceType}
                  </td>
                </tr>

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                      No transactions in this date range.
                    </td>
                  </tr>
                )}

                {rows.map(({ line, balance, balanceType }, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{line.date}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{line.entryNumber}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{line.narration}</td>
                    <td className="px-4 py-3 text-slate-600">{line.partyName || '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatAmount(line.debit)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatAmount(line.credit)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatAmount(balance)} <span className="text-xs text-slate-500">{balanceType}</span>
                    </td>
                  </tr>
                ))}

                {/* Closing balance row */}
                <tr className="bg-blue-50 border-t-2 border-blue-100">
                  <td className="px-4 py-3 font-semibold text-slate-700" colSpan={4}>
                    Closing Balance
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">
                    {formatAmount(rows.reduce((s, r) => s + r.line.debit, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">
                    {formatAmount(rows.reduce((s, r) => s + r.line.credit, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">
                    {formatAmount(closingBalance)} <span className="text-xs">{closingBalanceType}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
