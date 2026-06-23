'use client'

import { useEffect, useState } from 'react'

interface Account {
  id: string
  name: string
  code: string
  type: string
  sub_type?: string
  group?: string
}

// Tally-compatible groups with their Schedule III mapping
const TALLY_GROUPS = [
  // Capital & Reserves
  { group: 'Capital Account',           tallyGroup: 'Capital Account',           type: 'equity',   sub_type: 'capital',              scheduleIII: 'Share Capital' },
  { group: 'Reserves & Surplus',        tallyGroup: 'Reserves & Surplus',        type: 'equity',   sub_type: 'reserves',             scheduleIII: 'Reserves and Surplus' },
  // Loans
  { group: 'Secured Loans',             tallyGroup: 'Secured Loans',             type: 'liability', sub_type: 'long_term_loan',       scheduleIII: 'Long-term Borrowings' },
  { group: 'Unsecured Loans',           tallyGroup: 'Unsecured Loans',           type: 'liability', sub_type: 'long_term_loan',       scheduleIII: 'Long-term Borrowings' },
  { group: 'Bank OD Accounts',          tallyGroup: 'Bank OD Accounts',          type: 'liability', sub_type: 'short_term_borrowing', scheduleIII: 'Short-term Borrowings' },
  // Current Liabilities
  { group: 'Current Liabilities',       tallyGroup: 'Current Liabilities',       type: 'liability', sub_type: 'other_current_liability', scheduleIII: 'Other Current Liabilities' },
  { group: 'Duties & Taxes',            tallyGroup: 'Duties & Taxes',            type: 'liability', sub_type: 'other_current_liability', scheduleIII: 'Other Current Liabilities' },
  { group: 'Provisions',                tallyGroup: 'Provisions',                type: 'liability', sub_type: 'st_provision',         scheduleIII: 'Short-term Provisions' },
  { group: 'Sundry Creditors',          tallyGroup: 'Sundry Creditors',          type: 'liability', sub_type: 'payable',              scheduleIII: 'Trade Payables' },
  // Fixed Assets
  { group: 'Fixed Assets',              tallyGroup: 'Fixed Assets',              type: 'asset',    sub_type: 'fixed_asset',          scheduleIII: 'Tangible Assets' },
  { group: 'Investments',               tallyGroup: 'Investments',               type: 'asset',    sub_type: 'investment_lt',        scheduleIII: 'Non-Current Investments' },
  // Current Assets
  { group: 'Sundry Debtors',            tallyGroup: 'Sundry Debtors',            type: 'asset',    sub_type: 'receivable',           scheduleIII: 'Trade Receivables' },
  { group: 'Bank Accounts',             tallyGroup: 'Bank Accounts',             type: 'asset',    sub_type: 'bank',                 scheduleIII: 'Cash and Cash Equivalents' },
  { group: 'Cash-in-Hand',              tallyGroup: 'Cash-in-Hand',              type: 'asset',    sub_type: 'cash',                 scheduleIII: 'Cash and Cash Equivalents' },
  { group: 'Deposits (Asset)',          tallyGroup: 'Deposits (Asset)',           type: 'asset',    sub_type: 'loans_advances_lt',    scheduleIII: 'Long-term Loans and Advances' },
  { group: 'Loans & Advances (Asset)',  tallyGroup: 'Loans & Advances (Asset)',  type: 'asset',    sub_type: 'loans_advances_st',    scheduleIII: 'Short-term Loans and Advances' },
  { group: 'Stock-in-Hand',             tallyGroup: 'Stock-in-Hand',             type: 'asset',    sub_type: 'inventory',            scheduleIII: 'Inventories' },
  // Income
  { group: 'Direct Income',             tallyGroup: 'Direct Income',             type: 'income',   sub_type: 'direct_income',        scheduleIII: '' },
  { group: 'Indirect Income',           tallyGroup: 'Indirect Income',           type: 'income',   sub_type: 'other_income',         scheduleIII: '' },
  { group: 'Sales Accounts',            tallyGroup: 'Sales Accounts',            type: 'income',   sub_type: 'sales',                scheduleIII: '' },
  // Expenses
  { group: 'Direct Expenses',           tallyGroup: 'Direct Expenses',           type: 'expense',  sub_type: 'direct_expense',       scheduleIII: '' },
  { group: 'Indirect Expenses',         tallyGroup: 'Indirect Expenses',         type: 'expense',  sub_type: 'indirect_expense',     scheduleIII: '' },
  { group: 'Purchase Accounts',         tallyGroup: 'Purchase Accounts',         type: 'expense',  sub_type: 'purchases',            scheduleIII: '' },
]

const DEFAULT_GROUP = TALLY_GROUPS[0]

const TYPE_LABELS: Record<string, string> = {
  asset: 'Asset', liability: 'Liability', equity: 'Equity', income: 'Income', expense: 'Expense',
}

export default function LedgerCreatePage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [form, setForm] = useState({
    code: '',
    name: '',
    tallyGroup: DEFAULT_GROUP.group,
    type: DEFAULT_GROUP.type,
    sub_type: DEFAULT_GROUP.sub_type,
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

  const handleGroupChange = (groupName: string) => {
    const g = TALLY_GROUPS.find(tg => tg.group === groupName) ?? DEFAULT_GROUP
    setForm(f => ({ ...f, tallyGroup: g.group, type: g.type, sub_type: g.sub_type }))
  }

  const selectedGroup = TALLY_GROUPS.find(g => g.group === form.tallyGroup) ?? DEFAULT_GROUP

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
          group: form.tallyGroup,
          parent_id: form.parent_id || null,
          opening_balance: form.opening_balance ? parseFloat(form.opening_balance) : 0,
          opening_balance_type: form.opening_balance_type,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create account')
      setSuccess(`Account "${data.account.name}" created successfully.`)
      setForm({
        code: '', name: '', tallyGroup: DEFAULT_GROUP.group,
        type: DEFAULT_GROUP.type, sub_type: DEFAULT_GROUP.sub_type,
        parent_id: '', opening_balance: '', opening_balance_type: 'Dr',
      })
      fetchAccounts()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  // Group accounts by type for the table
  const grouped = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    const t = a.type || 'other'
    if (!acc[t]) acc[t] = []
    acc[t].push(a)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Create Ledger</h1>
        <p className="text-sm text-slate-500 mt-1">Add a new ledger to your chart of accounts.</p>
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
        <h2 className="text-base font-semibold text-slate-800 mb-5">New Ledger</h2>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Ledger Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Cash in Hand"
              />
            </div>

            {/* Ledger Group — replaces Type + Sub-type, just like Tally */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Ledger Group <span className="text-red-500">*</span></label>
              <select
                value={form.tallyGroup}
                onChange={e => handleGroupChange(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TALLY_GROUPS.map(g => (
                  <option key={g.group} value={g.group}>{g.group}</option>
                ))}
              </select>
              {/* Schedule III hint */}
              <p className="mt-1.5 text-xs text-slate-400">
                Type: <span className="font-medium text-slate-600">{TYPE_LABELS[selectedGroup.type] ?? selectedGroup.type}</span>
                {selectedGroup.scheduleIII ? (
                  <> &nbsp;·&nbsp; Schedule III: <span className="font-medium text-slate-600">{selectedGroup.scheduleIII}</span></>
                ) : (
                  <> &nbsp;·&nbsp; <span className="text-slate-400">Not shown on Balance Sheet</span></>
                )}
              </p>
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
              {submitting ? 'Creating...' : 'Create Ledger'}
            </button>
          </div>
        </form>
      </div>

      {/* Chart of Accounts */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Chart of Accounts</h2>
          <p className="text-xs text-slate-500 mt-0.5">{accounts.length} ledgers total</p>
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
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-2 text-left text-xs font-medium text-slate-400 w-24">Code</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-slate-400">Name</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-slate-400">Tally Group</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map(a => {
                      const tg = TALLY_GROUPS.find(g => g.group === a.group)
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-slate-500">{a.code}</td>
                          <td className="px-5 py-3 text-slate-800 font-medium">{a.name}</td>
                          <td className="px-5 py-3 text-slate-500 text-xs">
                            {a.group ? (
                              <span>
                                {a.group}
                                {tg?.scheduleIII ? (
                                  <span className="ml-2 text-slate-400">— {tg.scheduleIII}</span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
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
