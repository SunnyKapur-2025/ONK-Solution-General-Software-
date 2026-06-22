'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'

type IncomeEntry = {
  id: string
  entryNumber: string
  date: string
  category: string
  narration: string
  amount: number
}

const INCOME_CATEGORIES = [
  { label: 'Interest Income', code: '4200' },
  { label: 'Rental Income', code: '4210' },
  { label: 'Commission', code: '4220' },
  { label: 'Dividend', code: '4230' },
  { label: 'Other Income', code: '4250' },
]

export default function IncomePage() {
  const [tab, setTab] = useState<'list' | 'add'>('list')
  const [entries, setEntries] = useState<IncomeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: INCOME_CATEGORIES[0].code,
    narration: '',
    amount: '',
    receivedVia: 'bank',
    reference: '',
  })

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setTenantId(d.tenantId))
      .catch(() => setError('Failed to load tenant'))
  }, [])

  const loadEntries = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/vouchers?tenantId=${tenantId}&type=journal&q=income`)
      if (!res.ok) {
        // Endpoint might not exist yet; show empty state gracefully
        setEntries([])
        return
      }
      const data = await res.json()
      // Normalize to expected shape
      const normalized: IncomeEntry[] = (data || []).map((e: Record<string, unknown>) => ({
        id: String(e.id),
        entryNumber: String(e.entry_number || e.entryNumber || ''),
        date: String(e.entry_date || e.date || ''),
        category: String(e.voucher_type || 'journal'),
        narration: String(e.narration || ''),
        amount: Number(e.amount || 0),
      }))
      setEntries(normalized)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { if (tenantId) loadEntries() }, [tenantId, loadEntries])

  const categoryLabel = (code: string) => INCOME_CATEGORIES.find((c) => c.code === code)?.label || 'Other Income'

  // Bank account code: 1620 (standard), Cash: 1610
  const BANK_CODE = '1620'
  const CASH_CODE = '1610'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) return
    setSubmitting(true)
    setSubmitError('')

    try {
      // Resolve the income account ID
      const meRes = await fetch('/api/me')
      if (!meRes.ok) throw new Error('Failed to load tenant')

      // Use /api/vouchers to post a journal entry directly
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          date: form.date,
          narration: form.narration || categoryLabel(form.category),
          voucherType: 'journal',
          reference: form.reference,
          lines: [
            // Debit: Bank or Cash (money received)
            {
              accountCode: form.receivedVia === 'cash' ? CASH_CODE : BANK_CODE,
              debit: parseFloat(form.amount),
              credit: 0,
              narration: categoryLabel(form.category),
            },
            // Credit: Income account
            {
              accountCode: form.category,
              debit: 0,
              credit: parseFloat(form.amount),
              narration: form.narration || categoryLabel(form.category),
            },
          ],
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to record income')
      }

      setSuccessMsg(`Income of ${formatCurrency(parseFloat(form.amount))} recorded.`)
      setForm((f) => ({ ...f, narration: '', amount: '', reference: '' }))
      await loadEntries()
      setTimeout(() => { setTab('list'); setSuccessMsg('') }, 1500)
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to record income')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Other Income</h1>
          <p className="text-slate-500 text-sm mt-0.5">Interest, rent, commission, dividend, and other non-sales income</p>
        </div>
        <button
          onClick={() => setTab('add')}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Record Income
        </button>
      </div>

      {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">{error}</p>}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['list', 'add'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'list' ? 'Income Entries' : 'Record Income'}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <p className="text-center py-12 text-slate-400">Loading entries…</p>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm">No income entries yet.</p>
              <p className="text-slate-400 text-xs mt-1">Click "Record Income" to add one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Entry #', 'Date', 'Category', 'Narration', 'Amount'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left font-medium text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-blue-700">{entry.entryNumber}</td>
                      <td className="px-5 py-3 text-slate-600">{entry.date}</td>
                      <td className="px-5 py-3 text-slate-600">{entry.category}</td>
                      <td className="px-5 py-3 text-slate-700 max-w-xs truncate">{entry.narration}</td>
                      <td className="px-5 py-3 font-mono font-medium text-green-700">{formatCurrency(entry.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'add' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 mb-6">Record Other Income</h2>
          {successMsg && <p className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 text-sm">{successMsg}</p>}
          {submitError && <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">{submitError}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Income Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {INCOME_CATEGORIES.map(({ label, code }) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description / Narration *</label>
              <input
                required
                value={form.narration}
                onChange={(e) => setForm((f) => ({ ...f, narration: e.target.value }))}
                placeholder="e.g. Interest from HDFC FD for Q4"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Amount *</label>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Received Via</label>
                <select
                  value={form.receivedVia}
                  onChange={(e) => setForm((f) => ({ ...f, receivedVia: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank">Bank</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Reference (optional)</label>
              <input
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                placeholder="e.g. FD certificate no., cheque no."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-medium"
              >
                {submitting ? 'Saving…' : 'Record Income'}
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
