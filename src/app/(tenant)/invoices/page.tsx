'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'

type Invoice = {
  id: string
  invoiceNumber: string
  date: string
  customer: string
  amount: number
  status: string
  narration: string
}

const GST_RATES = [0, 5, 12, 18, 28]

export default function InvoicesPage() {
  const [tab, setTab] = useState<'list' | 'create'>('list')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Form state
  const [form, setForm] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    description: '',
    amount: '',
    gstRate: 18,
    gstType: 'intra' as 'intra' | 'inter',
    dueDate: '',
    notes: '',
    paidNow: false,
    paidVia: 'cash',
  })

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => {
        setTenantId(d.tenantId)
        // Auto-generate invoice number
        setForm((f) => ({ ...f, invoiceNumber: `INV-${Date.now().toString().slice(-6)}` }))
      })
      .catch(() => setError('Failed to load tenant'))
  }, [])

  const loadInvoices = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices?tenantId=${tenantId}`)
      if (!res.ok) throw new Error((await res.json()).error)
      setInvoices(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { if (tenantId) loadInvoices() }, [tenantId, loadInvoices])

  const amountNum = parseFloat(form.amount) || 0
  const cgst = form.gstRate > 0 && form.gstType === 'intra' ? Math.round(amountNum * form.gstRate / 2) / 100 : 0
  const sgst = cgst
  const igst = form.gstRate > 0 && form.gstType === 'inter' ? Math.round(amountNum * form.gstRate) / 100 : 0
  const totalAmount = amountNum + cgst + sgst + igst

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          date: form.date,
          customerName: form.customerName,
          invoiceNumber: form.invoiceNumber,
          description: form.description,
          amount: amountNum,
          gstRate: form.gstRate,
          gstType: form.gstType,
          paidNow: form.paidNow,
          paidVia: form.paidVia,
          reference: form.notes,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSuccessMsg(`Invoice ${form.invoiceNumber} created successfully.`)
      setForm((f) => ({
        ...f,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        customerName: '',
        description: '',
        amount: '',
        notes: '',
        dueDate: '',
      }))
      await loadInvoices()
      setTimeout(() => { setTab('list'); setSuccessMsg('') }, 1500)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to create invoice')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage and create sales invoices</p>
        </div>
        <button
          onClick={() => setTab('create')}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + New Invoice
        </button>
      </div>

      {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">{error}</p>}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['list', 'create'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'list' ? 'Invoices' : 'Create Invoice'}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <p className="text-center py-12 text-slate-400">Loading invoices…</p>
          ) : invoices.length === 0 ? (
            <p className="text-center py-12 text-slate-400 text-sm">No invoices yet. Create your first invoice.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Invoice #', 'Date', 'Customer', 'Amount', 'Status'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left font-medium text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-blue-700">{inv.invoiceNumber}</td>
                      <td className="px-5 py-3 text-slate-600">{inv.date}</td>
                      <td className="px-5 py-3 text-slate-700">{inv.customer}</td>
                      <td className="px-5 py-3 font-mono text-slate-800">{formatCurrency(inv.amount)}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'create' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-6">New Invoice</h2>
          {successMsg && <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 text-sm">{successMsg}</p>}
          {submitError && <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">{submitError}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Invoice Number</label>
                <input
                  value={form.invoiceNumber}
                  onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Customer Name *</label>
                <input
                  required
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  placeholder="Customer or business name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description of Service / Goods *</label>
              <input
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Web development services for March 2026"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Amount (excl. tax) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">GST Rate</label>
                <select
                  value={form.gstRate}
                  onChange={(e) => setForm((f) => ({ ...f, gstRate: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>{r}%</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">State Type</label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm h-[38px]">
                  {(['intra', 'inter'] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, gstType: t }))}
                      className={`flex-1 font-medium transition-colors ${
                        form.gstType === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t === 'intra' ? 'Intra-state' : 'Inter-state'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tax summary */}
            {amountNum > 0 && form.gstRate > 0 && (
              <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm space-y-1">
                <p className="text-slate-500">Base amount: <span className="font-medium text-slate-800">{formatCurrency(amountNum)}</span></p>
                {form.gstType === 'intra' ? (
                  <>
                    <p className="text-slate-500">CGST ({form.gstRate / 2}%): <span className="font-medium text-slate-800">{formatCurrency(cgst)}</span></p>
                    <p className="text-slate-500">SGST ({form.gstRate / 2}%): <span className="font-medium text-slate-800">{formatCurrency(sgst)}</span></p>
                  </>
                ) : (
                  <p className="text-slate-500">IGST ({form.gstRate}%): <span className="font-medium text-slate-800">{formatCurrency(igst)}</span></p>
                )}
                <p className="font-semibold text-slate-800 border-t border-slate-200 pt-1">Total: {formatCurrency(totalAmount)}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Any additional notes…"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.paidNow}
                  onChange={(e) => setForm((f) => ({ ...f, paidNow: e.target.checked }))}
                  className="rounded"
                />
                Mark as paid immediately
              </label>
              {form.paidNow && (
                <select
                  value={form.paidVia}
                  onChange={(e) => setForm((f) => ({ ...f, paidVia: e.target.value }))}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                </select>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-medium"
              >
                {submitting ? 'Creating…' : 'Create Invoice'}
              </button>
              <button
                type="button"
                onClick={() => setTab('list')}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
