'use client'

import { formatCurrency } from '@/lib/utils'
import type { BalanceSheetReport, ScheduleIIIPart } from '@/lib/accounting/reports'

interface Props {
  report: BalanceSheetReport
  prevReport?: BalanceSheetReport | null
}

const TS = { fontFamily: "'Times New Roman', Times, serif", fontSize: '11pt' } as const

function getPartTotal(parts: ScheduleIIIPart[], partKey: string): number {
  return parts.find(p => p.part === partKey)?.total ?? 0
}

function getItemTotal(parts: ScheduleIIIPart[], partKey: string, itemKey: string): number {
  const part = parts.find(p => p.part === partKey)
  return part?.items.find(i => i.item === itemKey)?.total ?? 0
}

type SideProps = {
  parts: ScheduleIIIPart[]
  prevParts?: ScheduleIIIPart[] | null
  side: 'el' | 'assets'
}

function Side({ parts, prevParts, side }: SideProps) {
  const elHeads = [
    {
      part: 'I', label: 'Shareholders\' Funds', items: [
        { key: 'share_capital', label: '(a) Share capital' },
        { key: 'reserves', label: '(b) Reserves and surplus' },
        { key: 'money_securities', label: '(c) Money received against share warrants' },
      ]
    },
    {
      part: 'II', label: 'Share Application Money Pending Allotment', items: [
        { key: 'share_app_money', label: 'Share application money pending allotment' },
      ]
    },
    {
      part: 'III', label: 'Non-Current Liabilities', items: [
        { key: 'long_term_borrowings', label: '(a) Long-term borrowings' },
        { key: 'deferred_tax', label: '(b) Deferred tax liabilities (Net)' },
        { key: 'other_long_term', label: '(c) Other long-term liabilities' },
        { key: 'long_term_provisions', label: '(d) Long-term provisions' },
      ]
    },
    {
      part: 'IV', label: 'Current Liabilities', items: [
        { key: 'short_term_borrowings', label: '(a) Short-term borrowings' },
        { key: 'trade_payables', label: '(b) Trade payables' },
        { key: 'other_current_liabilities', label: '(c) Other current liabilities' },
        { key: 'short_term_provisions', label: '(d) Short-term provisions' },
      ]
    },
  ]

  const assetHeads = [
    {
      part: 'I', label: 'Non-Current Assets', items: [
        { key: 'fixed_assets', label: '(a) Fixed assets' },
        { key: 'non_current_investments', label: '(b) Non-current investments' },
        { key: 'deferred_tax_asset', label: '(c) Deferred tax assets (Net)' },
        { key: 'long_term_loans', label: '(d) Long-term loans and advances' },
        { key: 'other_non_current', label: '(e) Other non-current assets' },
      ]
    },
    {
      part: 'II', label: 'Current Assets', items: [
        { key: 'current_investments', label: '(a) Current investments' },
        { key: 'inventories', label: '(b) Inventories' },
        { key: 'trade_receivables', label: '(c) Trade receivables' },
        { key: 'cash_equivalents', label: '(d) Cash and cash equivalents' },
        { key: 'short_term_loans', label: '(e) Short-term loans and advances' },
        { key: 'other_current', label: '(f) Other current assets' },
      ]
    },
  ]

  const heads = side === 'el' ? elHeads : assetHeads

  return (
    <>
      {heads.map(head => {
        const partTotal = getPartTotal(parts, head.part)
        const prevPartTotal = prevParts ? getPartTotal(prevParts, head.part) : 0
        if (partTotal === 0 && prevPartTotal === 0) return null

        return (
          <tbody key={head.part}>
            <tr style={{ borderTop: '1px solid #94a3b8' }}>
              <td style={{ ...TS, fontWeight: 'bold', padding: '4px 8px', background: '#f8fafc' }} colSpan={prevParts ? 3 : 2}>
                {head.part}. {head.label}
              </td>
            </tr>
            {head.items.map(item => {
              const val = getItemTotal(parts, head.part, item.key)
              const prev = prevParts ? getItemTotal(prevParts, head.part, item.key) : 0
              if (val === 0 && prev === 0) return null
              return (
                <tr key={item.key} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ ...TS, paddingLeft: '20px', paddingTop: '2px', paddingBottom: '2px', paddingRight: '8px', color: '#374151' }}>{item.label}</td>
                  {prevParts && (
                    <td style={{ ...TS, textAlign: 'right', paddingRight: '12px', paddingTop: '2px', paddingBottom: '2px', color: '#6b7280', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                      {prev ? formatCurrency(prev) : '—'}
                    </td>
                  )}
                  <td style={{ ...TS, textAlign: 'right', paddingRight: '8px', paddingTop: '2px', paddingBottom: '2px', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                    {val ? formatCurrency(val) : '—'}
                  </td>
                </tr>
              )
            })}
            <tr style={{ borderBottom: '1px solid #cbd5e1', background: '#f1f5f9' }}>
              <td style={{ ...TS, fontWeight: 'bold', paddingLeft: '8px', paddingTop: '3px', paddingBottom: '3px', paddingRight: '8px' }}>
                Total {head.label}
              </td>
              {prevParts && (
                <td style={{ ...TS, textAlign: 'right', paddingRight: '12px', fontFamily: 'monospace', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {formatCurrency(prevPartTotal)}
                </td>
              )}
              <td style={{ ...TS, textAlign: 'right', paddingRight: '8px', fontFamily: 'monospace', fontWeight: 'bold', whiteSpace: 'nowrap', borderTop: '1px solid #64748b' }}>
                {formatCurrency(partTotal)}
              </td>
            </tr>
          </tbody>
        )
      })}
    </>
  )
}

export default function BalanceSheetReportView({ report, prevReport }: Props) {
  const { equityAndLiabilities, assets, isBalanced, difference, asOnDate } = report

  const formattedDate = new Date(asOnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const prevDate = prevReport ? new Date(prevReport.asOnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  return (
    <div style={TS}>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm 10mm 12mm 10mm; }
          body * { visibility: hidden; }
          #bs-printable, #bs-printable * { visibility: visible; }
          #bs-printable { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1e293b', paddingBottom: '8px', marginBottom: '8px' }}>
        <p style={{ ...TS, fontSize: '13pt', fontWeight: 'bold' }}>Balance Sheet</p>
        <p style={{ ...TS, fontSize: '10pt', color: '#374151' }}>as at {formattedDate}</p>
        <p style={{ fontSize: '9pt', color: '#64748b' }}>Schedule III — Companies Act, 2013 &nbsp;·&nbsp; (Amount in ₹)</p>
      </div>

      {!isBalanced && (
        <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', marginBottom: '8px', color: '#991b1b' }}>
          Balance Sheet does not balance — difference: {formatCurrency(difference)}
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Left — Equity & Liabilities */}
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', ...TS }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1e293b', background: '#f8fafc' }}>
                <th style={{ ...TS, textAlign: 'left', padding: '6px 8px', fontWeight: 'bold' }}>Equity &amp; Liabilities</th>
                {prevReport && <th style={{ ...TS, textAlign: 'right', paddingRight: '12px', fontWeight: 'bold', color: '#6b7280', whiteSpace: 'nowrap' }}>{prevDate?.slice(-4)}</th>}
                <th style={{ ...TS, textAlign: 'right', paddingRight: '8px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{formattedDate.slice(-4)}</th>
              </tr>
            </thead>
            <Side parts={equityAndLiabilities.parts} prevParts={prevReport?.equityAndLiabilities.parts} side="el" />
            <tfoot>
              <tr style={{ borderTop: '2px solid #1e293b' }}>
                <td style={{ ...TS, fontWeight: 'bold', padding: '6px 8px' }}>TOTAL</td>
                {prevReport && (
                  <td style={{ ...TS, textAlign: 'right', paddingRight: '12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#6b7280', whiteSpace: 'nowrap', borderBottom: '4px double #1e293b' }}>
                    {formatCurrency(prevReport.equityAndLiabilities.total)}
                  </td>
                )}
                <td style={{ ...TS, textAlign: 'right', paddingRight: '8px', fontFamily: 'monospace', fontWeight: 'bold', whiteSpace: 'nowrap', borderBottom: '4px double #1e293b' }}>
                  {formatCurrency(equityAndLiabilities.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Right — Assets */}
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', ...TS }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1e293b', background: '#f8fafc' }}>
                <th style={{ ...TS, textAlign: 'left', padding: '6px 8px', fontWeight: 'bold' }}>Assets</th>
                {prevReport && <th style={{ ...TS, textAlign: 'right', paddingRight: '12px', fontWeight: 'bold', color: '#6b7280', whiteSpace: 'nowrap' }}>{prevDate?.slice(-4)}</th>}
                <th style={{ ...TS, textAlign: 'right', paddingRight: '8px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{formattedDate.slice(-4)}</th>
              </tr>
            </thead>
            <Side parts={assets.parts} prevParts={prevReport?.assets.parts} side="assets" />
            <tfoot>
              <tr style={{ borderTop: '2px solid #1e293b' }}>
                <td style={{ ...TS, fontWeight: 'bold', padding: '6px 8px' }}>TOTAL</td>
                {prevReport && (
                  <td style={{ ...TS, textAlign: 'right', paddingRight: '12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#6b7280', whiteSpace: 'nowrap', borderBottom: '4px double #1e293b' }}>
                    {formatCurrency(prevReport.assets.total)}
                  </td>
                )}
                <td style={{ ...TS, textAlign: 'right', paddingRight: '8px', fontFamily: 'monospace', fontWeight: 'bold', whiteSpace: 'nowrap', borderBottom: '4px double #1e293b' }}>
                  {formatCurrency(assets.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #cbd5e1', marginTop: '8px', paddingTop: '4px', textAlign: 'center' }}>
        <p style={{ fontSize: '9pt', color: '#64748b' }}>
          The accompanying notes are an integral part of these financial statements.
          &nbsp;·&nbsp; Schedule III — Companies Act, 2013.
        </p>
      </div>
    </div>
  )
}
