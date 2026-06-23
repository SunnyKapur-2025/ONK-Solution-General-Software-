'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface PaymentForm {
  date: string
  vendorId: string
  vendorName: string
  amount: number
  paidFrom: string
  narration: string
  reference: string
}

interface Props {
  tenantId: string
  creditors: { id: string; name: string }[]
  bankAccounts: { id: string; name: string }[]
  recentEntries: { id: string; entry_number: string; entry_date: string; narration: string; status: string }[]
}

export default function PaymentsPageClient({ tenantId, creditors, bankAccounts, recentEntries }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [showForm, setShowForm] = useState(false)
  const [entries, setEntries] = useState(recentEntries)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<PaymentForm>({
    date: today,
    vendorId: '',
    vendorName: '',
    amount: 0,
    paidFrom: bankAccounts[0]?.id || 'cash',
    narration: '',
    reference: '',
  })

  function set<K extends keyof PaymentForm>(key: K, value: PaymentForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.amount <= 0) {
      setError('Please enter the payment amount.')
      return
    }
    if (!form.vendorId && !form.vendorName) {
      setError('Please select or enter a vendor.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      const newEntry = await res.json()
      setEntries((prev) => [newEntry, ...prev])
      setForm({
        date: today,
        vendorId: '',
        vendorName: '',
        amount: 0,
        paidFrom: bankAccounts[0]?.id || 'cash',
        narration: '',
        reference: '',
      })
      setShowForm(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500 text-sm mt-0.5">Record payments made to vendors and creditors</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          {showForm ? '✕ Cancel' : '+ New Payment'}
        </button>
      </div>

      {saved && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
          Payment recorded successfully. Accounting entries created automatically.
        </div>
      )}

      {/* Payment Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Record Vendor Payment</h2>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Pay to (Vendor / Creditor)</label>
              <select
                value={form.vendorId}
                onChange={(e) => {
                  const vendor = creditors.find((v) => v.id === e.target.value)
                  set('vendorId', e.target.value)
                  set('vendorName', vendor?.name || '')
                }}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Select vendor —</option>
                {creditors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              {!form.vendorId && (
                <input
                  type="text"
                  value={form.vendorName}
                  onChange={(e) => set('vendorName', e.target.value)}
                  className="w-full mt-2 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Or type vendor name manually"
                />
              )}
            </div>

            {/* Amount */}
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
                  className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                  placeholder="0.00"
                />
              </div>
              {form.amount > 0 && (
                <p className="text-xs text-slate-500 mt-1">{formatCurrency(form.amount)}</p>
              )}
            </div>

            {/* Pay from */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Pay from</label>
              <select
                value={form.paidFrom}
                onChange={(e) => set('paidFrom', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="cash">Cash in Hand</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Narration */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Narration <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.narration}
                onChange={(e) => set('narration', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Payment for bill INV-001, NEFT ref UTR123"
              />
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Reference / Cheque No. <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => set('reference', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="e.g. CHQ-001234 or UTR12345"
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
              {loading ? 'Saving…' : `Record Payment${form.amount > 0 ? ` of ${formatCurrency(form.amount)}` : ''}`}
            </button>
            <p className="text-center text-xs text-slate-400">
              Accounting entries (Dr Creditor, Cr Bank) are created automatically.
            </p>
          </form>
        </div>
      )}

      {/* Recent Payments */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Recent Payments</h3>
        </div>
        {entries.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <p className="font-medium">No payments recorded yet</p>
            <p className="text-sm mt-1">Click &quot;New Payment&quot; to record your first vendor payment.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Entry No.</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Narration</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.slice(0, 5).map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-slate-700">{e.entry_number}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(e.entry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{e.narration}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium
                      ${e.status === 'posted' ? 'bg-green-100 text-green-700' :
                        e.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-600'}`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
