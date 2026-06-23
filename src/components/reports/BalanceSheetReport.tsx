'use client'

import { formatCurrency } from '@/lib/utils'
import type { BalanceSheetReport, ScheduleIIIPart, ScheduleIIILineItem } from '@/lib/accounting/reports'

interface Props {
  report: BalanceSheetReport
}

function LineItemRows({ item }: { item: ScheduleIIILineItem }) {
  return (
    <>
      <tr>
        <td className="pl-6 pr-2 py-1.5 text-xs font-semibold text-slate-600 border-b border-slate-100" colSpan={2}>
          {item.label}
        </td>
      </tr>
      {item.accounts.map((a) => (
        <tr key={a.accountId} className="hover:bg-slate-50">
          <td className="pl-10 pr-2 py-1 text-xs text-slate-600 border-b border-slate-50">{a.accountName}</td>
          <td className="pr-4 py-1 text-right text-xs font-mono text-slate-700 border-b border-slate-50 whitespace-nowrap">
            {formatCurrency(a.balance)}
          </td>
        </tr>
      ))}
      <tr className="border-b border-slate-200">
        <td className="pl-6 pr-2 py-1 text-xs text-slate-500"></td>
        <td className="pr-4 py-1 text-right text-xs font-mono font-semibold text-slate-800 whitespace-nowrap border-t border-slate-300">
          {formatCurrency(item.total)}
        </td>
      </tr>
    </>
  )
}

function PartSection({ part }: { part: ScheduleIIIPart }) {
  if (part.items.length === 0) return null
  return (
    <>
      <tr className="bg-slate-50">
        <td className="px-4 py-2 text-xs font-bold text-slate-700 border-b border-slate-200" colSpan={2}>
          {part.part}. {part.heading}
        </td>
      </tr>
      {part.items.map((item) => (
        <LineItemRows key={item.item} item={item} />
      ))}
      <tr className="bg-slate-100 border-t border-slate-300">
        <td className="px-4 py-2 text-xs font-bold text-slate-700">
          Total {part.heading}
        </td>
        <td className="pr-4 py-2 text-right text-xs font-bold font-mono text-slate-800 whitespace-nowrap">
          {formatCurrency(part.total)}
        </td>
      </tr>
    </>
  )
}

export default function BalanceSheetReportView({ report }: Props) {
  const { equityAndLiabilities, assets, isBalanced, difference, asOnDate } = report

  const formattedDate = new Date(asOnDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="print:text-[10pt]">
      {/* Title */}
      <div className="text-center mb-4 print:mb-2">
        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Balance Sheet</h2>
        <p className="text-sm text-slate-500">as at {formattedDate}</p>
        <p className="text-xs text-slate-400 mt-0.5">NCE Format — ICAI Guidance Note on Financial Statements for Non-Corporate Entities</p>
      </div>

      {/* Balance warning */}
      {!isBalanced && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700 font-medium print:border-red-400">
          Balance Sheet does not balance — difference: {formatCurrency(difference)}
        </div>
      )}

      {/* Two-column table */}
      <div className="overflow-x-auto">
        <table className="w-full border border-slate-300 text-sm print:border-black" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b-2 border-slate-300 print:border-black">
              <th className="px-4 py-2 text-left text-xs font-bold text-slate-700 border-r border-slate-300 print:border-black w-1/2">
                EQUITY AND LIABILITIES
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 border-r border-slate-200 print:border-black w-20">
                Amount (₹)
              </th>
              <th className="px-4 py-2 text-left text-xs font-bold text-slate-700 border-r border-slate-300 print:border-black">
                ASSETS
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 print:border-black">
                Amount (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Render rows interleaved — equity/liabilities on left, assets on right */}
            <BalanceSheetRows
              elParts={equityAndLiabilities.parts}
              elTotal={equityAndLiabilities.total}
              assetParts={assets.parts}
              assetTotal={assets.total}
            />
          </tbody>
        </table>
      </div>

      {/* Totals row */}
      <div className="mt-0 border border-t-0 border-slate-300 print:border-black">
        <div className="flex">
          <div className="w-1/2 border-r border-slate-300 print:border-black px-4 py-2.5 flex justify-between items-center bg-slate-800 print:bg-white">
            <span className="text-sm font-bold text-white print:text-black">TOTAL</span>
            <span className="text-sm font-bold font-mono text-white print:text-black">{formatCurrency(equityAndLiabilities.total)}</span>
          </div>
          <div className="w-1/2 px-4 py-2.5 flex justify-between items-center bg-slate-800 print:bg-white">
            <span className="text-sm font-bold text-white print:text-black">TOTAL</span>
            <span className="text-sm font-bold font-mono text-white print:text-black">{formatCurrency(assets.total)}</span>
          </div>
        </div>
      </div>

      {isBalanced && (
        <p className="text-center text-xs text-green-600 mt-3 print:hidden">
          Balance Sheet is balanced.
        </p>
      )}
    </div>
  )
}

// Renders two sides side-by-side row by row using a flat row approach
function BalanceSheetRows({
  elParts, elTotal,
  assetParts, assetTotal,
}: {
  elParts: ScheduleIIIPart[]
  elTotal: number
  assetParts: ScheduleIIIPart[]
  assetTotal: number
}) {
  // Flatten left side (equity & liabilities) into display rows
  type Row = { kind: 'part-heading'; heading: string; part: string }
            | { kind: 'item-heading'; label: string }
            | { kind: 'account'; name: string; balance: number }
            | { kind: 'item-total'; total: number }
            | { kind: 'part-total'; label: string; total: number }
            | { kind: 'spacer' }

  function flattenSide(parts: ScheduleIIIPart[]): Row[] {
    const rows: Row[] = []
    for (const part of parts) {
      if (part.items.length === 0) continue
      rows.push({ kind: 'part-heading', heading: part.heading, part: part.part })
      for (const item of part.items) {
        rows.push({ kind: 'item-heading', label: item.label })
        for (const a of item.accounts) {
          rows.push({ kind: 'account', name: a.accountName, balance: a.balance })
        }
        rows.push({ kind: 'item-total', total: item.total })
      }
      rows.push({ kind: 'part-total', label: `Total ${part.heading}`, total: part.total })
    }
    return rows
  }

  const left = flattenSide(elParts)
  const right = flattenSide(assetParts)
  const maxLen = Math.max(left.length, right.length)

  function renderCell(row: Row | undefined): React.ReactNode {
    if (!row) return <td className="px-4 py-1.5" colSpan={2}></td>
    switch (row.kind) {
      case 'part-heading':
        return (
          <td className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-50 border-b border-slate-200" colSpan={2}>
            {row.part}. {row.heading}
          </td>
        )
      case 'item-heading':
        return (
          <td className="pl-6 pr-2 py-1.5 text-xs font-semibold text-slate-600 border-b border-slate-100" colSpan={2}>
            {row.label}
          </td>
        )
      case 'account':
        return (
          <>
            <td className="pl-10 pr-2 py-1 text-xs text-slate-600 border-b border-slate-50">{row.name}</td>
            <td className="pr-4 py-1 text-right text-xs font-mono text-slate-700 border-b border-slate-50 whitespace-nowrap">
              {formatCurrency(row.balance)}
            </td>
          </>
        )
      case 'item-total':
        return (
          <>
            <td className="pl-6 py-1 text-xs text-slate-400 border-b border-slate-200"></td>
            <td className="pr-4 py-1 text-right text-xs font-mono font-semibold text-slate-800 border-b border-slate-200 border-t border-slate-300 whitespace-nowrap">
              {formatCurrency(row.total)}
            </td>
          </>
        )
      case 'part-total':
        return (
          <td className="px-4 py-2 bg-slate-100 border-b border-slate-300" colSpan={2}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">{row.label}</span>
              <span className="text-xs font-bold font-mono text-slate-800 whitespace-nowrap">{formatCurrency(row.total)}</span>
            </div>
          </td>
        )
      case 'spacer':
        return <td className="px-4 py-1" colSpan={2}></td>
    }
  }

  return (
    <>
      {Array.from({ length: maxLen }).map((_, i) => (
        <tr key={i} className="hover:bg-slate-50/50">
          <td className="border-r border-slate-200 print:border-black" colSpan={2} style={{ padding: 0 }}>
            <table className="w-full"><tbody><tr>{renderCell(left[i])}</tr></tbody></table>
          </td>
          <td colSpan={2} style={{ padding: 0 }}>
            <table className="w-full"><tbody><tr>{renderCell(right[i])}</tr></tbody></table>
          </td>
        </tr>
      ))}
    </>
  )
}
