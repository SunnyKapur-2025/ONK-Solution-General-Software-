'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface TDSRow {
  month: string
  section: string
  payeeName: string
  amount: number
  tdsRate: number
  tdsAmount: number
}

const TDS_SECTIONS = [
  { code: '194C', label: '194C — Contractor/Sub-contractor', rate: 1 },
  { code: '194J', label: '194J — Professional / Technical Services', rate: 10 },
  { code: '194I', label: '194I — Rent', rate: 10 },
  { code: '194H', label: '194H — Commission / Brokerage', rate: 5 },
  { code: '194A', label: '194A — Interest (Bank/FD)', rate: 10 },
  { code: '192',  label: '192 — Salary', rate: 0 },
]

export default function TDSPage() {
  const [rows, setRows] = useState<TDSRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ payeeName: '', section: '194J', amount: '', month: new Date().toISOString().slice(0, 7) })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const sec = TDS_SECTIONS.find(s => s.code === form.section)!
    const amt = parseFloat(form.amount)
    setRows(prev => [...prev, {
      month: form.month,
      section: form.section,
      payeeName: form.payeeName,
      amount: amt,
      tdsRate: sec.rate,
      tdsAmount: Math.round(amt * sec.rate / 100 * 100) / 100,
    }])
    setForm(f => ({ ...f, payeeName: '', amount: '' }))
    setShowForm(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const totalTDS = rows.reduce((s, r) => s + r.tdsAmount, 0)

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">TDS Centre</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track TDS deducted at source — reconcile with 26AS</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm">
          {showForm ? '✕ Cancel' : '+ Add TDS Entry'}
        </button>
      </div>

      {saved && <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">TDS entry recorded.</div>}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Total TDS Deducted</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalTDS)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Entries</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{rows.length}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-xs text-blue-600 font-medium">Reminder</p>
          <p className="text-sm text-blue-700 mt-1">TDS due by 7th of next month. File quarterly returns.</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Record TDS Deduction</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payee Name</label>
              <input required value={form.payeeName} onChange={e => setForm(f => ({...f, payeeName: e.target.value}))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Name of deductee" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
              <input type="month" value={form.month} onChange={e => setForm(f => ({...f, month: e.target.value}))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">TDS Section</label>
              <select value={form.section} onChange={e => setForm(f => ({...f, section: e.target.value}))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {TDS_SECTIONS.map(s => <option key={s.code} value={s.code}>{s.label} ({s.rate}%)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount (₹)</label>
              <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00" />
            </div>
            <div className="col-span-2 flex justify-end">
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium text-sm">
                Save TDS Entry
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">TDS Register</h3>
        </div>
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <p className="text-4xl mb-3">📑</p>
            <p className="font-medium">No TDS entries yet</p>
            <p className="text-sm mt-1">Add entries to track TDS deductions and reconcile with 26AS.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Month</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Section</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Payee</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Amount</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Rate</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">TDS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-600">{r.month}</td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{r.section}</span></td>
                  <td className="px-4 py-3 text-slate-800">{r.payeeName}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{r.tdsRate}%</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">{formatCurrency(r.tdsAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-300">
              <tr>
                <td colSpan={5} className="px-5 py-3 font-bold text-slate-700">Total TDS</td>
                <td className="px-4 py-3 text-right font-bold font-mono text-red-700">{formatCurrency(totalTDS)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
