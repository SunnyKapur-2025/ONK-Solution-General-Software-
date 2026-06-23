'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, getCurrentFinancialYear } from '@/lib/utils'
import type { PnLReport, AccountBalance } from '@/lib/accounting/reports'

function AccountRows({ accounts, emptyMsg }: { accounts: AccountBalance[]; emptyMsg?: string }) {
  if (accounts.length === 0) {
    return <tr><td colSpan={3} className="pl-8 pr-2 py-0.5 text-slate-400 italic print:text-slate-400">{emptyMsg ?? '—'}</td></tr>
  }
  return (
    <>
      {accounts.map(a => (
        <tr key={a.accountId}>
          <td className="pl-8 pr-2 py-0.5 text-slate-700 border-b border-slate-100">{a.accountName}</td>
          <td></td>
          <td className="pr-3 py-0.5 text-right font-mono text-slate-800 border-b border-slate-100 whitespace-nowrap">
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
      <td className={`px-3 py-0.5 ${bold ? 'font-bold' : ''} text-slate-900`}>{label}</td>
      <td className="px-1 py-0.5 text-center text-slate-500 w-8">{note ?? ''}</td>
      <td className={`pr-3 py-0.5 text-right font-mono whitespace-nowrap ${bold ? 'font-bold' : ''} text-slate-900`}>
        {formatCurrency(total)}
      </td>
    </tr>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="border-t border-slate-300">
      <td className="px-3 py-0.5 font-semibold text-slate-800 underline" colSpan={3}>{label}</td>
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
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          body * { visibility: hidden; }
          #pnl-printable, #pnl-printable * { visibility: visible; }
          #pnl-printable { position: absolute; top: 0; left: 0; width: 100%; }
          #pnl-controls { display: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Controls — hidden on print */}
        <div id="pnl-controls" className="flex items-start justify-between mb-5 no-print">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Statement of Profit &amp; Loss</h1>
            <p className="text-slate-500 text-sm mt-0.5">Financial Year {fy} — NCE Format (ICAI)</p>
          </div>
          <button onClick={() => window.print()}
            className="text-sm border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50">
            🖨 Print / PDF
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-end gap-4 mb-5 no-print">
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

        {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm no-print">{error}</p>}

        {report && (
          <div
            id="pnl-printable"
            style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11pt', lineHeight: '1.4' }}
            className="bg-white border border-slate-300 overflow-hidden print:border-0"
          >
            {/* Header */}
            <div className="text-center border-b-2 border-slate-800 py-3 px-4">
              <p style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '13pt', fontWeight: 'bold' }}>
                Statement of Profit and Loss
              </p>
              <p style={{ fontSize: '10pt' }} className="text-slate-700 mt-0.5">
                for the period ended {new Date(to).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <p style={{ fontSize: '9pt' }} className="text-slate-500">(Amount in ₹)</p>
            </div>

            <table className="w-full border-collapse" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11pt' }}>
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-50">
                  <th className="text-left px-3 py-1.5 font-bold text-slate-900">Particulars</th>
                  <th className="text-center px-1 py-1.5 font-bold text-slate-900 w-10">Note</th>
                  <th className="text-right pr-3 py-1.5 font-bold text-slate-900 w-40">
                    ₹ {report.toDate.slice(0, 4)}–{String(parseInt(report.toDate.slice(0, 4)) + 1).slice(2)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* I — Revenue from operations */}
                <SectionHeader label="I.   Revenue from operations" />
                <AccountRows accounts={report.revenueFromOperations ?? report.income.filter(a => !/other_income|interest|dividend/.test(a.subType))} />
                <SectionRow label="Revenue from operations" note={19} total={report.totalRevenue ?? report.totalIncome} bold />

                {/* II — Other income */}
                <SectionHeader label="II.  Other income" />
                <AccountRows accounts={report.otherIncome ?? []} emptyMsg="No other income" />
                <SectionRow label="Other income" note={20} total={report.totalOtherIncome ?? 0} bold />

                {/* III — Total income */}
                <tr className="border-t-2 border-slate-800 border-b border-slate-300">
                  <td className="px-3 py-1 font-bold text-slate-900">III.  Total income  (I + II)</td>
                  <td></td>
                  <td className="pr-3 py-1 text-right font-bold font-mono whitespace-nowrap text-slate-900 border-b-2 border-slate-800">
                    {formatCurrency(report.totalIncome)}
                  </td>
                </tr>

                {/* IV — Expenses */}
                <SectionHeader label="IV.  Expenses" />

                {(report.costOfGoodsSold?.length > 0 || report.directExpenses.length > 0) && (
                  <>
                    <tr><td className="pl-5 pr-2 py-0.5 italic text-slate-600" colSpan={3}>(a) Cost of goods sold / cost of services</td></tr>
                    <AccountRows accounts={report.costOfGoodsSold?.length ? report.costOfGoodsSold : report.directExpenses} />
                    <SectionRow label="(a) Cost of goods sold" note={21} total={report.totalCogs ?? 0} />
                  </>
                )}

                {report.employeeBenefits?.length > 0 && (
                  <>
                    <tr><td className="pl-5 pr-2 py-0.5 italic text-slate-600" colSpan={3}>(b) Employee benefits expense</td></tr>
                    <AccountRows accounts={report.employeeBenefits} />
                    <SectionRow label="(b) Employee benefits expense" note={22} total={report.totalEmployeeBenefits ?? 0} />
                  </>
                )}

                {report.financeCosts?.length > 0 && (
                  <>
                    <tr><td className="pl-5 pr-2 py-0.5 italic text-slate-600" colSpan={3}>(c) Finance costs</td></tr>
                    <AccountRows accounts={report.financeCosts} />
                    <SectionRow label="(c) Finance costs" note={23} total={report.totalFinanceCosts ?? 0} />
                  </>
                )}

                {report.depreciation?.length > 0 && (
                  <>
                    <tr><td className="pl-5 pr-2 py-0.5 italic text-slate-600" colSpan={3}>(d) Depreciation and amortisation expense</td></tr>
                    <AccountRows accounts={report.depreciation} />
                    <SectionRow label="(d) Depreciation and amortisation" note={24} total={report.totalDepreciation ?? 0} />
                  </>
                )}

                {(report.otherExpenses?.length > 0 || report.indirectExpenses.length > 0) && (
                  <>
                    <tr><td className="pl-5 pr-2 py-0.5 italic text-slate-600" colSpan={3}>(e) Other expenses</td></tr>
                    <AccountRows accounts={report.otherExpenses?.length ? report.otherExpenses : report.indirectExpenses} />
                    <SectionRow label="(e) Other expenses" note={25} total={report.totalOtherExpenses ?? report.indirectExpenses.reduce((s, a) => s + a.balance, 0)} />
                  </>
                )}

                <tr className="border-t-2 border-slate-800">
                  <td className="px-3 py-1 font-bold text-slate-900">Total expenses</td>
                  <td></td>
                  <td className="pr-3 py-1 text-right font-bold font-mono whitespace-nowrap text-slate-900 border-b-2 border-slate-800">
                    {formatCurrency(report.totalExpenses ?? (report.totalIncome - report.netProfit))}
                  </td>
                </tr>

                {/* V */}
                <tr className="border-b border-slate-200">
                  <td className="px-3 py-1 font-bold text-slate-900" colSpan={2}>
                    V.   Profit / (Loss) before partners&apos; remuneration and tax  (III − IV)
                  </td>
                  <td className="pr-3 py-1 text-right font-bold font-mono whitespace-nowrap text-slate-900">
                    {formatCurrency(Math.abs(report.profitBeforeTax ?? report.netProfit))}
                  </td>
                </tr>

                <tr className="border-b border-slate-200">
                  <td className="px-3 py-0.5 text-slate-700" colSpan={2}>VI.   Exceptional items (if any)</td>
                  <td className="pr-3 py-0.5 text-right font-mono text-slate-500">—</td>
                </tr>

                <tr className="border-b border-slate-200">
                  <td className="px-3 py-1 font-bold text-slate-900" colSpan={2}>
                    IX.   Profit before partners&apos; remuneration and tax
                  </td>
                  <td className="pr-3 py-1 text-right font-bold font-mono whitespace-nowrap text-slate-900">
                    {formatCurrency(Math.abs(report.profitBeforeTax ?? report.netProfit))}
                  </td>
                </tr>

                <tr className="border-b border-slate-200">
                  <td className="px-3 py-0.5 text-slate-700" colSpan={2}>X.    Partners&apos; / Proprietor&apos;s remuneration (if applicable)</td>
                  <td className="pr-3 py-0.5 text-right font-mono text-slate-500">—</td>
                </tr>

                <SectionRow label="XI.   Profit before tax" total={report.profitBeforeTax ?? report.netProfit} bold />

                <tr className="border-t border-slate-200">
                  <td className="px-3 py-0.5 font-semibold text-slate-800" colSpan={3}>XII.  Tax expense</td>
                </tr>
                <tr>
                  <td className="pl-8 py-0.5 text-slate-700" colSpan={2}>(a) Current tax</td>
                  <td className="pr-3 py-0.5 text-right font-mono text-slate-500">—</td>
                </tr>
                <tr>
                  <td className="pl-8 py-0.5 text-slate-700" colSpan={2}>(b) Deferred tax charge / (benefit)</td>
                  <td className="pr-3 py-0.5 text-right font-mono text-slate-500">—</td>
                </tr>

                {/* XIII — Net profit */}
                <tr className="border-t-2 border-slate-800">
                  <td className="px-3 py-1.5 font-bold text-slate-900" colSpan={2}>
                    XIII.  Net {isProfit ? 'Profit' : 'Loss'} for the year
                  </td>
                  <td className={`pr-3 py-1.5 text-right font-bold font-mono whitespace-nowrap border-t-2 border-b-4 border-double border-slate-800 ${isProfit ? 'text-green-800' : 'text-red-800'}`}>
                    {formatCurrency(Math.abs(netProfit))}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="px-4 py-2 border-t border-slate-300 mt-1">
              <p style={{ fontSize: '9pt' }} className="text-slate-500 text-center">
                The accompanying notes 1 to 25 are an integral part of these financial statements.
                &nbsp;·&nbsp; As per NCE Format — ICAI Guidance Note on Financial Statements for Non-Corporate Entities.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
