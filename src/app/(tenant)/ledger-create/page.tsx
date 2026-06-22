'use client'

import { useEffect, useState } from 'react'

interface Account {
  id: string
  name: string
  code: string
  type: string
  group?: string
}

const TYPE_SUBTYPES: Record<string, string[]> = {
  asset: ['bank', 'cash', 'receivable', 'fixed_asset', 'other'],
  liability: ['payable', 'loan', 'other'],
  equity: ['capital', 'retained_earnings', 'other'],
  income: ['revenue', 'other_income', 'other'],
  expense: ['operating', 'depreciation', 'other'],
}

const TYPE_LABELS: Record<string, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expense',
}

const SUBTYPE_LABELS: Record<string, string> = {
  bank: 'Bank', cash: 'Cash', receivable: 'Receivable', fixed_asset: 'Fixed Asset',
  payable: 'Payable', loan: 'Loan', capital: 'Capital', retained_earnings: 'Retained Earnings',
  revenue: 'Revenue', other_income: 'Other Income', operating: 'Operating Expense',
  depreciation: 'Depreciation', other: 'Other',
}

export default function LedgerCreatePage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'asset',
    sub_type: 'other',
    parent_id: '',
    opening_balance: '',
    opening_balance_type: 'Dr',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const fetchAccounts = () => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(d => setAccounts(d.accounts || []))
      .catch(() => {})
  }

  useEffect(() => { fetchAccounts() }, [])

  // Reset sub_type when type changes
  const handleTypeChange = (type: string) => {
    setForm(f => ({ ...f, type, sub_type: TYPE_SUBTYPES[type]?.[0] ?? 'other' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSuccess('')
    setError('')
    try {
      const res = await fetch('/api/accounts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          type: form.type,
          sub_type: form.sub_type,
          parent_id: form.parent_id || null,
          opening_balance: form.opening_balance ? parseFloat(form.opening_balance) : 0,
          opening_balance_type: form.opening_balance_type,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create account')
      setSuccess(`Account "${data.account.name}" created successfully.`)
      setForm({ code: '', name: '', type: 'asset', sub_type: 'other', parent_id: '', opening_balance: '', opening_balance_type: 'Dr' })
      fetchAccounts()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  // Group accounts by type
  const grouped = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    const t = a.type || 'other'
    if (!acc[t]) acc[t] = []
    acc[t].push(a)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Create Account</h1>
        <p className="text-sm text-slate-500 mt-1">Add a new account to your chart of accounts.</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Create Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-5">New Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Code <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 1001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Cash in Hand"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type <span className="text-red-500">*</span></label>
              <select
                value={form.type}
                onChange={e => handleTypeChange(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.keys(TYPE_SUBTYPES).map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sub-type</label>
              <select
                value={form.sub_type}
                onChange={e => setForm(f => ({ ...f, sub_type: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(TYPE_SUBTYPES[form.type] ?? []).map(st => (
                  <option key={st} value={st}>{SUBTYPE_LABELS[st] ?? st}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Parent Account</label>
              <select
                value={form.parent_id}
                onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Opening Balance</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.opening_balance}
                  onChange={e => setForm(f => ({ ...f, opening_balance: e.target.value }))}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                <select
                  value={form.opening_balance_type}
                  onChange={e => setForm(f => ({ ...f, opening_balance_type: e.target.value }))}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>

      {/* Chart of Accounts */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Chart of Accounts</h2>
          <p className="text-xs text-slate-500 mt-0.5">{accounts.length} accounts total</p>
        </div>
        {accounts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No accounts yet.</div>
        ) : (
          <div>
            {Object.entries(grouped).map(([type, list]) => (
              <div key={type}>
                <div className="bg-slate-50 px-5 py-2 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {TYPE_LABELS[type] ?? type}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {list.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-slate-500 w-24">{a.code}</td>
                        <td className="px-5 py-3 text-slate-800 font-medium">{a.name}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{a.group || SUBTYPE_LABELS[a.type] || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
