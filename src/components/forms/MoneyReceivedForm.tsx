'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface ReceiptEntry {
  date: string
  receivedFrom: string   // party name (free text or selected)
  partyId: string
  amount: number
  receivedInto: string   // bank account id or 'cash'
  against: string        // 'invoice' | 'advance' | 'other'
  invoiceRef: string
  narration: string
}

interface Props {
  debtors: { id: string; name: string; outstanding: number }[]
  bankAccounts: { id: string; name: string }[]
  onSubmit: (data: ReceiptEntry) => Promise<void>
}

export default function MoneyReceivedForm({ debtors, bankAccounts, onSubmit }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<ReceiptEntry>({
    date: today,
    receivedFrom: '',
    partyId: '',
    amount: 0,
    receivedInto: bankAccounts[0]?.id || 'cash',
    against: 'invoice',
    invoiceRef: '',
    narration: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedDebtor = debtors.find((d) => d.id === form.partyId)

  function set<K extends keyof ReceiptEntry>(key: K, value: ReceiptEntry[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.amount <= 0) {
      setError('Please enter the amount received.')
      return
    }
    if (!form.partyId && !form.receivedFrom) {
      setError('Please select or enter who paid.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onSubmit(form)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => set('date', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Who paid */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Money received from
        </label>
        <select
          value={form.partyId}
          onChange={(e) => {
            const d = debtors.find((x) => x.id === e.target.value)
            set('partyId', e.target.value)
            set('receivedFrom', d?.name || '')
          }}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">— Select customer / party —</option>
          {debtors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}{d.outstanding > 0 ? ` — Due: ${formatCurrency(d.outstanding)}` : ''}
            </option>
          ))}
          <option value="_new">Other (type name)</option>
        </select>
        {form.partyId === '_new' && (
          <input
            type="text"
            value={form.receivedFrom}
            onChange={(e) => set('receivedFrom', e.target.value)}
            className="w-full mt-2 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter party name"
          />
        )}
        {selectedDebtor && selectedDebtor.outstanding > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
            Outstanding due from {selectedDebtor.name}: {formatCurrency(selectedDebtor.outstanding)}
          </p>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Amount received (₹)
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount || ''}
            onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
            className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Received into */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Deposited / received into
        </label>
        <select
          value={form.receivedInto}
          onChange={(e) => set('receivedInto', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="cash">Cash in Hand</option>
          {bankAccounts.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Against what */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">This payment is against</label>
        <div className="flex gap-3">
          {[
            { val: 'invoice', label: 'An Invoice' },
            { val: 'advance', label: 'Advance Payment' },
            { val: 'other',   label: 'Other' },
          ].map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => set('against', opt.val)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                form.against === opt.val
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {form.against === 'invoice' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Invoice Number</label>
          <input
            type="text"
            value={form.invoiceRef}
            onChange={(e) => set('invoiceRef', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder="e.g. INV-2025-001"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Note <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={form.narration}
          onChange={(e) => set('narration', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Cheque no. 001234, NEFT ref UTR123"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
      >
        {loading ? 'Saving…' : `Record ₹${form.amount > 0 ? formatCurrency(form.amount) : '—'} Received`}
      </button>

      <p className="text-center text-xs text-slate-400">
        Accounting entries are created automatically. No debit/credit knowledge needed.
      </p>
    </form>
  )
}
