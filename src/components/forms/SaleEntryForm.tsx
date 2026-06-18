'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

const GST_RATES = [0, 5, 12, 18, 28]

interface SaleEntry {
  date: string
  customerName: string
  customerId: string
  invoiceNumber: string
  description: string
  amount: number
  gstRate: number
  gstType: 'intra' | 'inter'  // intra = CGST+SGST, inter = IGST
  paidVia: string             // bank account or cash
  paidNow: boolean
  reference: string
}

interface Props {
  customers: { id: string; name: string }[]
  bankAccounts: { id: string; name: string }[]
  onSubmit: (data: SaleEntry) => Promise<void>
}

export default function SaleEntryForm({ customers, bankAccounts, onSubmit }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState<SaleEntry>({
    date: today,
    customerName: '',
    customerId: '',
    invoiceNumber: '',
    description: '',
    amount: 0,
    gstRate: 18,
    gstType: 'intra',
    paidVia: bankAccounts[0]?.id || '',
    paidNow: false,
    reference: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newCustomer, setNewCustomer] = useState(false)

  // Derived tax calculations
  const baseAmount = form.amount
  const gstAmount = Math.round((baseAmount * form.gstRate) / 100 * 100) / 100
  const cgst = form.gstType === 'intra' ? gstAmount / 2 : 0
  const sgst = form.gstType === 'intra' ? gstAmount / 2 : 0
  const igst = form.gstType === 'inter' ? gstAmount : 0
  const totalAmount = baseAmount + gstAmount

  function set<K extends keyof SaleEntry>(key: K, value: SaleEntry[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description || form.amount <= 0) {
      setError('Please fill in what was sold and the amount.')
      return
    }
    if (!form.customerId && !form.customerName) {
      setError('Please select or enter a customer name.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onSubmit({ ...form })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Row 1: Date + Invoice No ── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Sale</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Invoice Number</label>
          <input
            type="text"
            value={form.invoiceNumber}
            onChange={(e) => set('invoiceNumber', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder="Auto-generated if blank"
          />
        </div>
      </div>

      {/* ── Customer ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-slate-700">Customer / Client Name</label>
          <button
            type="button"
            onClick={() => setNewCustomer((v) => !v)}
            className="text-xs text-blue-600 hover:underline"
          >
            {newCustomer ? 'Pick existing customer' : '+ Add new customer'}
          </button>
        </div>
        {newCustomer ? (
          <input
            type="text"
            value={form.customerName}
            onChange={(e) => set('customerName', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type customer name"
            required
          />
        ) : (
          <select
            value={form.customerId}
            onChange={(e) => set('customerId', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            required
          >
            <option value="">— Select customer —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── What was sold ── */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          What was sold / service provided
        </label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Security services for June 2025, or Freight charges Mumbai–Delhi"
          required
        />
      </div>

      {/* ── Amount ── */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Amount (before GST) <span className="text-slate-400 font-normal">in ₹</span>
        </label>
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
            required
          />
        </div>
      </div>

      {/* ── GST ── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">GST Rate</label>
          <select
            value={form.gstRate}
            onChange={(e) => set('gstRate', Number(e.target.value))}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {GST_RATES.map((r) => (
              <option key={r} value={r}>{r === 0 ? 'No GST (0%)' : `${r}%`}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">GST Type</label>
          <select
            value={form.gstType}
            onChange={(e) => set('gstType', e.target.value as 'intra' | 'inter')}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="intra">Within State (CGST + SGST)</option>
            <option value="inter">Outside State (IGST)</option>
          </select>
        </div>
      </div>

      {/* ── Tax Breakdown (live preview) ── */}
      {form.amount > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-1.5 text-sm">
          <p className="font-semibold text-blue-900 mb-2">Invoice Summary</p>
          <div className="flex justify-between text-slate-700">
            <span>Base Amount</span>
            <span className="font-mono">{formatCurrency(baseAmount)}</span>
          </div>
          {form.gstRate > 0 && form.gstType === 'intra' && (
            <>
              <div className="flex justify-between text-slate-600">
                <span>CGST @ {form.gstRate / 2}%</span>
                <span className="font-mono">{formatCurrency(cgst)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST @ {form.gstRate / 2}%</span>
                <span className="font-mono">{formatCurrency(sgst)}</span>
              </div>
            </>
          )}
          {form.gstRate > 0 && form.gstType === 'inter' && (
            <div className="flex justify-between text-slate-600">
              <span>IGST @ {form.gstRate}%</span>
              <span className="font-mono">{formatCurrency(igst)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-blue-900 border-t border-blue-200 pt-1.5 mt-1">
            <span>Total Invoice Amount</span>
            <span className="font-mono">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      )}

      {/* ── Payment ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="paidNow"
            checked={form.paidNow}
            onChange={(e) => set('paidNow', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600"
          />
          <label htmlFor="paidNow" className="text-sm font-medium text-slate-700">
            Payment received now (not on credit)
          </label>
        </div>

        {form.paidNow && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Payment received into
            </label>
            <select
              value={form.paidVia}
              onChange={(e) => set('paidVia', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="cash">Cash in Hand</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Reference ── */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Reference / PO Number <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={form.reference}
          onChange={(e) => set('reference', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. PO-2025-456"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
      >
        {loading ? 'Saving…' : 'Save Sale Entry'}
      </button>

      <p className="text-center text-xs text-slate-400">
        Accounting entries are created automatically. No debit/credit knowledge needed.
      </p>
    </form>
  )
}
