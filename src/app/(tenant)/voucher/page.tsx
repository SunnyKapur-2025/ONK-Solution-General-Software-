'use client'

import { useState, useEffect } from 'react'
import PowerModeEntry, { VoucherType } from '@/components/power-mode/PowerModeEntry'

interface Account { id: string; name: string; code: string; type: string }
interface Party  { id: string; name: string }

export default function VoucherPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [parties,  setParties]  = useState<Party[]>([])
  const [saved, setSaved] = useState<{ entryNumber: string; id: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(d => setAccounts(d.accounts || []))
    fetch('/api/parties').then(r => r.json()).then(d => setParties(d.parties || []))
  }, [])

  async function handleSave(voucher: {
    type: VoucherType
    date: string
    partyId: string
    narration: string
    reference: string
    lines: Array<{ accountId: string; accountName: string; debit: number; credit: number; narration: string }>
  }) {
    setError('')
    const res = await fetch('/api/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: voucher.date,
        narration: voucher.narration || voucher.reference,
        lines: voucher.lines,
        voucherType: voucher.type,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to save'); return }
    setSaved({ entryNumber: data.entryNumber, id: data.id })
  }

  if (saved) {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-400 text-5xl mb-4">✓</div>
          <p className="text-green-400 text-xl font-bold font-mono">Entry Saved</p>
          <p className="text-slate-400 font-mono mt-2">{saved.entryNumber}</p>
          <div className="flex gap-4 mt-6 justify-center">
            <button
              onClick={() => setSaved(null)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-mono text-sm"
            >
              New Entry
            </button>
            <a href="/day-book"
              className="border border-slate-600 text-slate-300 hover:text-white px-6 py-2 rounded font-mono text-sm">
              Day Book
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 min-h-screen">
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-5 py-2 text-sm font-mono">
          Error: {error}
        </div>
      )}
      <PowerModeEntry
        accounts={accounts}
        parties={parties}
        onSave={handleSave}
      />
    </div>
  )
}
