'use client'

import { useState } from 'react'
import MoneyReceivedForm from '@/components/forms/MoneyReceivedForm'

interface Props {
  tenantId: string
  debtors: { id: string; name: string; outstanding: number }[]
  bankAccounts: { id: string; name: string }[]
  recentEntries: { id: string; entry_number: string; entry_date: string; narration: string; status: string }[]
}

export default function ReceiptsPageClient({ tenantId, debtors, bankAccounts, recentEntries }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [entries, setEntries] = useState(recentEntries)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(data: Parameters<React.ComponentProps<typeof MoneyReceivedForm>['onSubmit']>[0]) {
    const res = await fetch('/api/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, tenantId, type: 'receipt' }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to save')
    }
    const newEntry = await res.json()
    setEntries((prev) => [newEntry, ...prev])
    setShowForm(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Receipts</h1>
          <p className="text-slate-500 text-sm mt-0.5">Record money received from customers</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          {showForm ? '✕ Cancel' : '+ Record Receipt'}
        </button>
      </div>

      {saved && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
          Receipt recorded successfully. Accounting entries created automatically.
        </div>
      )}

      {/* Entry Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Record Money Received</h2>
          <MoneyReceivedForm
            debtors={debtors}
            bankAccounts={bankAccounts}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {/* Recent Entries */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Recent Receipts</h3>
        </div>
        {entries.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <p className="font-medium">No receipts recorded yet</p>
            <p className="text-sm mt-1">Click &quot;Record Receipt&quot; to log your first payment received.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Entry No.</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
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
