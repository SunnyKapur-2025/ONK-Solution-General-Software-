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

// Rates & thresholds as per Finance Act 2025 / New Income Tax Bill 2025 (effective FY 2025-26)
const TDS_SECTIONS_2025 = [
  // ── Salary ──────────────────────────────────────────────────────────────
  { code: '192',       label: '192 — Salary',                                    rate: 0,    threshold: 'Basic exemption limit (₹3L new regime / ₹2.5L old)',  note: 'New regime default from FY 2025-26; slab deduction at source',         group: 'Salary' },
  { code: '192A',      label: '192A — PF Premature Withdrawal',                  rate: 10,   threshold: '₹50,000',                                             note: '20% if PAN not furnished',                                             group: 'Salary' },

  // ── Interest & Dividends ─────────────────────────────────────────────────
  { code: '194',       label: '194 — Dividend (Company)',                        rate: 10,   threshold: '₹10,000 per year',                                    note: 'Threshold raised from ₹5,000 (Finance Act 2025)',                      group: 'Interest & Dividends' },
  { code: '194A',      label: '194A — Interest (Bank / Post Office)',            rate: 10,   threshold: '₹1,00,000 (Sr. Citizen) / ₹50,000 (Others) p.a.',    note: 'Revised thresholds Finance Act 2025; 20% if PAN absent',               group: 'Interest & Dividends' },
  { code: '194A-NB',   label: '194A — Interest (Non-Banking)',                   rate: 10,   threshold: '₹10,000 per year',                                    note: '',                                                                     group: 'Interest & Dividends' },
  { code: '194B',      label: '194B — Lottery / Crossword / Game Show',          rate: 30,   threshold: '₹10,000 per transaction',                             note: 'Deduct at source before paying prize',                                 group: 'Interest & Dividends' },
  { code: '194BB',     label: '194BB — Winnings from Horse Race',                rate: 30,   threshold: '₹10,000 per transaction',                             note: '',                                                                     group: 'Interest & Dividends' },
  { code: '194K',      label: '194K — Mutual Fund Units / UTI',                  rate: 10,   threshold: '₹5,000 per year',                                     note: 'Only on income distributions, not capital repayment',                  group: 'Interest & Dividends' },
  { code: '194LBA',    label: '194LBA — Business Trust (REIT/InvIT) Income',     rate: 10,   threshold: 'Any amount',                                           note: '5% for non-resident unit holders',                                     group: 'Interest & Dividends' },

  // ── Contractors & Professionals ──────────────────────────────────────────
  { code: '194C',      label: '194C — Contractor (Individual / HUF)',            rate: 1,    threshold: '₹30,000 single / ₹1,00,000 aggregate p.a.',           note: '',                                                                     group: 'Contractors & Professionals' },
  { code: '194C-Co',   label: '194C — Contractor (Company / Firm)',              rate: 2,    threshold: '₹30,000 single / ₹1,00,000 aggregate p.a.',           note: '',                                                                     group: 'Contractors & Professionals' },
  { code: '194D',      label: '194D — Insurance Commission',                     rate: 2,    threshold: '₹20,000 per year',                                    note: 'Rate reduced to 2% & threshold raised (Finance Act 2025)',             group: 'Contractors & Professionals' },
  { code: '194G',      label: '194G — Commission on Lottery Tickets',            rate: 2,    threshold: '₹20,000 per year',                                    note: 'Threshold raised from ₹15,000 (Finance Act 2025)',                     group: 'Contractors & Professionals' },
  { code: '194H',      label: '194H — Commission / Brokerage',                   rate: 2,    threshold: '₹20,000 per year',                                    note: 'Rate reduced to 2% & threshold raised (Finance Act 2025)',             group: 'Contractors & Professionals' },
  { code: '194J',      label: '194J — Professional Fees (Doctor, CA, Legal…)',   rate: 10,   threshold: '₹50,000 per year',                                    note: 'Threshold raised from ₹30,000 (Finance Act 2025)',                     group: 'Contractors & Professionals' },
  { code: '194J-T',    label: '194J — Technical Services / Royalty / Call Ctr',  rate: 2,    threshold: '₹50,000 per year',                                    note: 'Reduced rate; covers software royalty, call-centre work',              group: 'Contractors & Professionals' },
  { code: '194M',      label: '194M — Payment by Individual/HUF (Contractual)',  rate: 2,    threshold: '₹50,00,000 per year',                                 note: 'Covers 194C/H/J payments by individuals not liable to audit',          group: 'Contractors & Professionals' },
  { code: '194T',      label: '194T — Salary/Interest/Commission to Partners',   rate: 10,   threshold: '₹20,000 per year',                                    note: 'NEW — effective 1 Apr 2025 (Finance Act 2024 §68); firm deducts TDS on partner remuneration', group: 'Contractors & Professionals' },

  // ── Rent ─────────────────────────────────────────────────────────────────
  { code: '194I(a)',   label: '194I(a) — Rent: Plant, Machinery, Equipment',     rate: 2,    threshold: '₹50,000 per month (₹6,00,000 p.a.)',                 note: 'Threshold raised (Finance Act 2025)',                                  group: 'Rent' },
  { code: '194I(b)',   label: '194I(b) — Rent: Land / Building / Furniture',     rate: 10,   threshold: '₹50,000 per month (₹6,00,000 p.a.)',                 note: 'Threshold raised (Finance Act 2025)',                                  group: 'Rent' },
  { code: '194IB',     label: '194IB — Rent by Individual/HUF (non-audit)',      rate: 5,    threshold: '₹50,000 per month',                                   note: 'Deduct once at last month / vacating the property',                   group: 'Rent' },
  { code: '194IC',     label: '194IC — Payment under Joint Development Agreement', rate: 10, threshold: 'Any amount',                                           note: 'Consideration (cash/kind) to land owner',                             group: 'Rent' },

  // ── Property ─────────────────────────────────────────────────────────────
  { code: '194-IA',    label: '194-IA — Purchase of Immovable Property',         rate: 1,    threshold: '₹50,00,000 per property',                             note: 'Buyer deducts; use Form 26QB; no TAN required',                       group: 'Property' },

  // ── Others ───────────────────────────────────────────────────────────────
  { code: '194N',      label: '194N — Cash Withdrawal from Bank / Co-op',        rate: 2,    threshold: '₹1 Crore p.a. (₹20L for non-ITR filers in 3 yrs)',   note: '5% above ₹3 Crore for non-filers; check ITR filing status',           group: 'Others' },
  { code: '194O',      label: '194O — E-commerce Operator (on seller)',           rate: 0.1,  threshold: '₹5,00,000 per year',                                  note: 'Rate reduced from 1% to 0.1% (Finance Act 2025)',                     group: 'Others' },
  { code: '194Q',      label: '194Q — Purchase of Goods (Buyer > ₹10Cr TO)',     rate: 0.1,  threshold: '₹50 Lakhs per seller per year',                       note: 'Not applicable if TCS under 206C(1H) already deducted',               group: 'Others' },
  { code: '194R',      label: '194R — Benefits / Perquisites to Business/Prof',  rate: 10,   threshold: '₹20,000 per year',                                    note: 'Covers gifts, free products, travel, hospitality to dealers/agents',  group: 'Others' },
  { code: '194S',      label: '194S — Transfer of Virtual Digital Asset (VDA)',  rate: 1,    threshold: '₹50,000 (specified persons) / ₹10,000 (others)',      note: 'Crypto, NFT etc.; use Form 26QE if buyer individual/HUF',             group: 'Others' },
  { code: '206C(1H)',  label: '206C(1H) — TCS on Sale of Goods (Seller)',        rate: 0.1,  threshold: '₹50 Lakhs per buyer per year (seller TO > ₹10Cr)',    note: 'TCS — not TDS; buyer can claim credit in Form 26AS',                  group: 'Others' },
]

const GROUPS = ['Salary', 'Interest & Dividends', 'Contractors & Professionals', 'Rent', 'Property', 'Others'] as const

export default function TDSPage() {
  const [rows, setRows] = useState<TDSRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ payeeName: '', section: '194J', amount: '', month: new Date().toISOString().slice(0, 7) })
  const [calcSection, setCalcSection] = useState('194J')
  const [calcAmount, setCalcAmount] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const sec = TDS_SECTIONS_2025.find(s => s.code === form.section)!
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
  const totalGross = rows.reduce((s, r) => s + r.amount, 0)

  const calcSec = TDS_SECTIONS_2025.find(s => s.code === calcSection)
  const calcGross = parseFloat(calcAmount) || 0
  const calcTDS = calcSec ? Math.round(calcGross * calcSec.rate / 100 * 100) / 100 : 0
  const calcNet = calcGross - calcTDS

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">TDS Centre</h1>
          <p className="text-slate-500 text-sm mt-0.5">Rates &amp; thresholds as per Finance Act 2025 / New Income Tax Bill 2025 (FY 2025-26)</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm">
          {showForm ? '✕ Cancel' : '+ Add TDS Entry'}
        </button>
      </div>

      {saved && <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">TDS entry recorded.</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Total TDS Deducted</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalTDS)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Gross Payments</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalGross)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-xs text-blue-600 font-medium">Reminder</p>
          <p className="text-sm text-blue-700 mt-1">TDS due by 7th of next month. File quarterly returns.</p>
        </div>
      </div>

      {/* TDS Calculator */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">TDS Calculator</h2>
        <div className="grid grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">TDS Section</label>
            <select value={calcSection} onChange={e => setCalcSection(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {GROUPS.map(grp => (
                <optgroup key={grp} label={grp}>
                  {TDS_SECTIONS_2025.filter(s => s.group === grp).map(s => (
                    <option key={s.code} value={s.code}>{s.label} ({s.rate}%)</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gross Amount (₹)</label>
            <input type="number" min="0" step="0.01" value={calcAmount} onChange={e => setCalcAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">TDS @ {calcSec?.rate ?? 0}%</span>
              <span className="font-semibold text-red-600">{formatCurrency(calcTDS)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <span className="text-slate-700 font-medium">Net Payable</span>
              <span className="font-bold text-slate-900">{formatCurrency(calcNet)}</span>
            </div>
          </div>
        </div>
        {calcSec?.note && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Note: {calcSec.note}</p>
        )}
        {calcSec && (
          <p className="mt-2 text-xs text-slate-500">Threshold: {calcSec.threshold}</p>
        )}
      </div>

      {/* Section reference table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">TDS Rates — Finance Act 2025</h3>
        </div>
        {GROUPS.map(grp => (
          <div key={grp}>
            <div className="px-6 py-2 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{grp}</p>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-50">
                {TDS_SECTIONS_2025.filter(s => s.group === grp).map(s => (
                  <tr key={s.code} className="hover:bg-slate-50">
                    <td className="px-6 py-2.5 font-mono text-xs text-slate-500 w-24">{s.code}</td>
                    <td className="px-4 py-2.5 text-slate-700">{s.label}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{s.threshold}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-800 w-16">{s.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div className="px-6 py-3 bg-amber-50 border-t border-amber-100">
          <p className="text-xs text-amber-700">Rates as per Finance Act 2025 / New Income Tax Act 2025 — consult CA for specific cases</p>
        </div>
      </div>

      {/* Add entry form */}
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
                {GROUPS.map(grp => (
                  <optgroup key={grp} label={grp}>
                    {TDS_SECTIONS_2025.filter(s => s.group === grp).map(s => (
                      <option key={s.code} value={s.code}>{s.label} ({s.rate}%)</option>
                    ))}
                  </optgroup>
                ))}
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

      {/* TDS Register */}
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
                <th className="text-right px-4 py-3 font-medium text-slate-600">Gross Amount</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Rate</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">TDS</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Net Payable</th>
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
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{formatCurrency(r.amount - r.tdsAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-300">
              <tr>
                <td colSpan={3} className="px-5 py-3 font-bold text-slate-700">Total</td>
                <td className="px-4 py-3 text-right font-bold font-mono text-slate-700">{formatCurrency(totalGross)}</td>
                <td />
                <td className="px-4 py-3 text-right font-bold font-mono text-red-700">{formatCurrency(totalTDS)}</td>
                <td className="px-4 py-3 text-right font-bold font-mono text-slate-700">{formatCurrency(totalGross - totalTDS)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
