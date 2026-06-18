'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

const EXPENSE_CATEGORIES = [
  { id: 'rent',        label: 'Rent',                      accountCode: '5300' },
  { id: 'salary',      label: 'Salaries & Wages',          accountCode: '5100' },
  { id: 'electricity', label: 'Electricity & Utilities',   accountCode: '5400' },
  { id: 'telephone',   label: 'Telephone & Internet',      accountCode: '5600' },
  { id: 'travel',      label: 'Travelling & Conveyance',   accountCode: '5700' },
  { id: 'office',      label: 'Office Expenses',           accountCode: '5500' },
  { id: 'bank',        label: 'Bank Charges & Fees',       accountCode: '5900' },
  { id: 'misc',        label: 'Miscellaneous Expense',     accountCode: '5920' },
  { id: 'other',       label: 'Other (specify below)',     accountCode: ''     },
]

interface ExpenseEntry {
  date: string
  category: string
  description: string
  amount: number
  gstRate: number
  paidVia: string
  paidTo: string
  reference: string
}

interface Props {
  bankAccounts: { id: string; name: string }[]
  onSubmit: (data: ExpenseEntry) => Promise<void>
}

export default function ExpenseEntryForm({ bankAccounts, onSubmit }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState<ExpenseEntry>({
    date: today,
    category: '',
    description: '',
    amount: 0,
    gstRate: 0,
    paidVia: 'cash',
    paidTo: '',
    reference: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const gstAmount = Math.round((form.amount * form.gstRate) / 100 * 100) / 100
  const totalAmount = form.amount + gstAmount

  function set<K extends keyof ExpenseEntry>(key: K, value: ExpenseEntry[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category || form.amount <= 0) {
      setError('Please select an expense type and enter the amount.')
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

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Expense</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => set('date', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Expense type — plain language tiles */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">What was the expense for?</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => set('category', cat.id)}
              className={`px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-all ${
                form.category === cat.id
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Description <span className="text-slate-400 font-normal">(brief note)</span>
        </label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Office rent for June 2025"
        />
      </div>

      {/* Paid to */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Paid to <span className="text-slate-400 font-normal">(person or company name)</span>
        </label>
        <input
          type="text"
          value={form.paidTo}
          onChange={(e) => set('paidTo', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Sharma Properties"
        />
      </div>

      {/* Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount || ''}
              onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
              className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">GST on this bill</label>
          <select
            value={form.gstRate}
            onChange={(e) => set('gstRate', Number(e.target.value))}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value={0}>No GST</option>
            <option value={5}>5%</option>
            <option value={12}>12%</option>
            <option value={18}>18%</option>
            <option value={28}>28%</option>
          </select>
        </div>
      </div>

      {/* Live total */}
      {form.amount > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-1.5">
          <div className="flex justify-between text-slate-600">
            <span>Expense Amount</span>
            <span className="font-mono">{formatCurrency(form.amount)}</span>
          </div>
          {form.gstRate > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>GST ({form.gstRate}%)</span>
              <span className="font-mono">{formatCurrency(gstAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5">
            <span>Total Paid</span>
            <span className="font-mono">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      )}

      {/* Paid via */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Paid via</label>
        <select
          value={form.paidVia}
          onChange={(e) => set('paidVia', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="cash">Cash</option>
          {bankAccounts.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Reference */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Bill / Receipt Number <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={form.reference}
          onChange={(e) => set('reference', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. BILL-2025-123"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
      >
        {loading ? 'Saving…' : 'Save Expense'}
      </button>

      <p className="text-center text-xs text-slate-400">
        Accounting entries are created automatically. No debit/credit knowledge needed.
      </p>
    </form>
  )
}
