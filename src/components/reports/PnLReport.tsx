'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, getCurrentFinancialYear } from '@/lib/utils'
import type { PnLReport, AccountBalance } from '@/lib/accounting/reports'

function AccountRows({ accounts, emptyMsg }: { accounts: AccountBalance[]; emptyMsg?: string }) {
  if (accounts.length === 0) {
    return <tr><td colSpan={3} className="px-6 py-2 text-xs text-slate-400 italic">{emptyMsg ?? '—'}</td></tr>
  }
  return (
    <>
      {accounts.map(a => (
        <tr key={a.accountId} className="hover:bg-slate-50">
          <td className="pl-10 pr-2 py-1.5 text-xs text-slate-600 border-b border-slate-50">{a.accountName}</td>
          <td></td>
          <td className="pr-6 py-1.5 text-right font-mono text-xs text-slate-700 border-b border-slate-50 whitespace-nowrap">
            {formatCurrency(a.balance)}
          </td>
        </tr>
      ))}
    </>
  )
}

function SectionRow({ label, note, total, bold, shade }: { label: string; note?: number; total: number; bold?: boolean; shade?: string }) {
  return (
    <tr className={shade ?? ''}>
      <td className={`px-6 py-2 text-sm ${bold ? 'font-bold' : ''} text-slate-800`}>{label}</td>
      <td className="px-2 py-2 text-xs text-slate-400 text-center">{note ? note : ''}</td>
      <td className={`pr-6 py-2 text-right font-mono text-sm whitespace-nowrap ${bold ? 'font-bold' : ''} text-slate-800`}>
        {formatCurrency(total)}
      </td>
    </tr>
  )
}

function SectionHeader({ roman, label }: { roman: string; label: string }) {
  return (
    <tr className="bg-slate-50 border-t border-slate-200">
      <td className="px-6 py-2 text-xs font-semibold text-slate-600" colSpan={3}>
        <span className="text-slate-400 mr-2">{roman}</span>{label}
      </td>
    </tr>
  )
}

export default function PnLReportPage() {
  const fy = getCurrentFinancialYear()
  const fyYear = parseInt(fy.split('-')[0])
  const defaultFrom = `${fyYear}-04-01`
  const defaultTo   = new Date().toISOString().split('T')[0]

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [report, setReport] = useState<PnLReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadReport() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/pnl?from=${from}&to=${to}&type=pnl`)
      if (!res.ok) throw new Error((await res.json()).error)
      setReport(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReport() }, [])

  const netProfit = report?.netProfit ?? 0
  const isProfit = netProfit >= 0

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Statement of Profit & Loss</h1>
          <p className="text-slate-500 text-sm mt-0.5">Financial Year {fy} — NCE Format (ICAI Guidance Note)</p>
        </div>
        <button onClick={() => window.print()}
          className="text-sm border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50">
          Print / PDF
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-end gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={loadReport}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium">
          {loading ? 'Loading…' : 'Generate'}
        </button>
      </div>

      {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm">{error}</p>}

      {report && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none">
          {/* Title block */}
          <div className="px-6 py-4 border-b border-slate-200 text-center">
            <p className="font-bold text-slate-900 text-base">Statement of Profit and Loss</p>
            <p className="text-xs text-slate-500 mt-0.5">for the year ended {report.toDate}</p>
            <p className="text-xs text-slate-400">(Amount in ₹)</p>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-600">Particulars</th>
                <th className="text-center px-2 py-2.5 text-xs font-semibold text-slate-600 w-16">Note</th>
                <th className="text-right pr-6 py-2.5 text-xs font-semibold text-slate-600 w-36">
                  {report.toDate.slice(0, 4)}–{String(parseInt(report.toDate.slice(0, 4)) + 1).slice(2)}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* I — Revenue from operations */}
              <SectionHeader roman="I" label="Revenue from operations" />
              <AccountRows accounts={report.revenueFromOperations ?? report.income.filter(a => !/other_income|interest|dividend/.test(a.subType))} />
              <SectionRow label="Revenue from operations" note={19} total={report.totalRevenue ?? report.totalIncome} />

              {/* II — Other income */}
              <SectionHeader roman="II" label="Other income" />
              <AccountRows accounts={report.otherIncome ?? []} emptyMsg="No other income" />
              <SectionRow label="Other income" note={20} total={report.totalOtherIncome ?? 0} />

              {/* III — Total income */}
              <SectionRow roman="III" label="Total income (I + II)" total={report.totalIncome} bold shade="bg-blue-50" />

              {/* IV — Expenses */}
              <SectionHeader roman="IV" label="Expenses" />

              {(report.costOfGoodsSold?.length > 0 || report.directExpenses.length > 0) && (
                <>
                  <tr><td className="pl-8 pr-2 py-1 text-xs text-slate-500 italic" colSpan={3}>(a) Cost of goods sold / cost of services</td></tr>
                  <AccountRows accounts={report.costOfGoodsSold?.length ? report.costOfGoodsSold : report.directExpenses} />
                  <SectionRow label="(a) Cost of goods sold" note={21} total={report.totalCogs ?? 0} />
                </>
              )}

              {report.employeeBenefits?.length > 0 && (
                <>
                  <tr><td className="pl-8 pr-2 py-1 text-xs text-slate-500 italic" colSpan={3}>(b) Employee benefits expense</td></tr>
                  <AccountRows accounts={report.employeeBenefits} />
                  <SectionRow label="(b) Employee benefits expense" note={22} total={report.totalEmployeeBenefits ?? 0} />
                </>
              )}

              {report.financeCosts?.length > 0 && (
                <>
                  <tr><td className="pl-8 pr-2 py-1 text-xs text-slate-500 italic" colSpan={3}>(c) Finance costs</td></tr>
                  <AccountRows accounts={report.financeCosts} />
                  <SectionRow label="(c) Finance costs" note={23} total={report.totalFinanceCosts ?? 0} />
                </>
              )}

              {report.depreciation?.length > 0 && (
                <>
                  <tr><td className="pl-8 pr-2 py-1 text-xs text-slate-500 italic" colSpan={3}>(d) Depreciation and amortisation expense</td></tr>
                  <AccountRows accounts={report.depreciation} />
                  <SectionRow label="(d) Depreciation and amortisation" note={24} total={report.totalDepreciation ?? 0} />
                </>
              )}

              {/* Other expenses = any indirectExpenses not categorized above */}
              {(report.otherExpenses?.length > 0 || report.indirectExpenses.length > 0) && (
                <>
                  <tr><td className="pl-8 pr-2 py-1 text-xs text-slate-500 italic" colSpan={3}>(e) Other expenses</td></tr>
                  <AccountRows accounts={report.otherExpenses?.length ? report.otherExpenses : report.indirectExpenses} />
                  <SectionRow label="(e) Other expenses" note={25} total={report.totalOtherExpenses ?? report.indirectExpenses.reduce((s, a) => s + a.balance, 0)} />
                </>
              )}

              <SectionRow label="Total expenses" total={report.totalExpenses ?? (report.totalIncome - report.netProfit)} bold shade="bg-red-50" />

              {/* V — Profit before remuneration & tax */}
              <tr className="bg-slate-50 border-t-2 border-slate-300">
                <td className="px-6 py-2.5 text-sm font-semibold text-slate-700" colSpan={2}>
                  V &nbsp; Profit / (loss) before partners&apos; remuneration and tax (III − IV)
                </td>
                <td className={`pr-6 py-2.5 text-right font-mono font-semibold text-sm whitespace-nowrap ${report.profitBeforeTax >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(Math.abs(report.profitBeforeTax ?? report.netProfit))}
                </td>
              </tr>

              {/* VI — Exceptional items */}
              <SectionRow roman="VI" label="Exceptional items (if any)" total={0} shade="bg-slate-50/50" />

              {/* IX — Profit before tax (simplified — skipping VIII extraordinary for brevity) */}
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="px-6 py-2.5 text-sm font-semibold text-slate-700" colSpan={2}>
                  IX &nbsp; Profit before partners&apos; remuneration and tax
                </td>
                <td className={`pr-6 py-2.5 text-right font-mono font-semibold text-sm whitespace-nowrap ${report.profitBeforeTax >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(Math.abs(report.profitBeforeTax ?? report.netProfit))}
                </td>
              </tr>

              {/* X — Partners' remuneration */}
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-2 text-sm text-slate-700" colSpan={2}>X &nbsp; Partners&apos; / Proprietor&apos;s remuneration (if applicable)</td>
                <td className="pr-6 py-2 text-right font-mono text-sm text-slate-500">—</td>
              </tr>

              {/* XI — Profit before tax */}
              <SectionRow label="XI  Profit before tax" total={report.profitBeforeTax ?? report.netProfit} bold shade="bg-slate-50" />

              {/* XII — Tax expense */}
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="px-6 py-1.5 text-xs font-semibold text-slate-600" colSpan={3}>XII &nbsp; Tax expense</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="pl-10 py-1.5 text-xs text-slate-600" colSpan={2}>(a) Current tax</td>
                <td className="pr-6 py-1.5 text-right font-mono text-xs text-slate-500">—</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="pl-10 py-1.5 text-xs text-slate-600" colSpan={2}>(b) Deferred tax charge / (benefit)</td>
                <td className="pr-6 py-1.5 text-right font-mono text-xs text-slate-500">—</td>
              </tr>

              {/* XIII — Net profit */}
              <tr className={`border-t-2 ${isProfit ? 'bg-green-600 border-green-700' : 'bg-red-600 border-red-700'}`}>
                <td className="px-6 py-4 text-white font-bold text-base" colSpan={2}>
                  XIII &nbsp; Net {isProfit ? 'Profit' : 'Loss'} for the year
                </td>
                <td className="pr-6 py-4 text-right font-bold font-mono text-white text-lg whitespace-nowrap">
                  {formatCurrency(Math.abs(netProfit))}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-400 text-center">
              The accompanying notes 1 to 25 are an integral part of these financial statements.
              &nbsp;|&nbsp; As per NCE Format — ICAI Guidance Note on Financial Statements for Non-Corporate Entities.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
