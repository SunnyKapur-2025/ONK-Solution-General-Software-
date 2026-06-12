/**
 * Generates correct double-entry journal entries from parsed contract note data.
 *
 * Accounting rules applied:
 *  - Equity Delivery BUY  → Dr Stock A/c, Dr Charges; Cr Broker A/c
 *  - Equity Delivery SELL → Dr Broker A/c, Dr Charges; Cr Stock A/c, Cr/Dr Capital Gains
 *  - Equity Intraday      → Dr/Cr Speculative Trading A/c (no stock movement)
 *  - F&O                  → Dr/Cr F&O Trading A/c (business income/loss)
 *  - MTF (Margin)         → Same as Delivery but flag MTF product
 */

import type { ParsedContractNote, ParsedTrade, ParsedCharges } from '../parsers/types'

export interface JournalLine {
  ledgerName: string
  ledgerGroup: string
  debit: number
  credit: number
  isParty: boolean
  narration?: string
}

export interface JournalEntry {
  date: string
  voucherType: 'Journal'
  narration: string
  lines: JournalLine[]
  isBalanced: boolean
  totalDebit: number
  totalCredit: number
  validationErrors: string[]
}

// Tally ledger group mappings
const LEDGER_GROUPS: Record<string, string> = {
  broker: 'Sundry Creditors',
  stock: 'Stock-in-Trade',
  brokerage: 'Indirect Expenses',
  stt: 'Indirect Expenses',
  exchangeCharges: 'Indirect Expenses',
  sebiCharges: 'Indirect Expenses',
  stampDuty: 'Indirect Expenses',
  cgst: 'Duties & Taxes',
  sgst: 'Duties & Taxes',
  igst: 'Duties & Taxes',
  stcg: 'Indirect Income',
  ltcg: 'Indirect Income',
  stcl: 'Indirect Expenses',
  ltcl: 'Indirect Expenses',
  speculativeIncome: 'Indirect Income',
  speculativeLoss: 'Indirect Expenses',
  foIncome: 'Indirect Income',
  foLoss: 'Indirect Expenses',
  foTrading: 'Current Assets',
}

function ledgerLine(
  ledgerName: string,
  group: string,
  debit: number,
  credit: number,
  isParty = false,
  narration?: string
): JournalLine {
  return { ledgerName, ledgerGroup: group, debit: round(debit), credit: round(credit), isParty, narration }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

function normalize(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/PASSENGE$/, 'PASSENGER')
    .trim()
    .toUpperCase()
}

/**
 * Generate journal entries for a complete contract note.
 * One entry per trade (granular) + one combined charges entry.
 */
export function generateJournalEntries(
  contractNote: ParsedContractNote,
  fifoAverageCost?: Record<string, number>  // isin → average cost per share
): JournalEntry[] {
  const entries: JournalEntry[] = []
  const brokerLedger = contractNote.brokerName
  const totalCharges = contractNote.charges.reduce<ParsedCharges>(
    (acc, c) => ({
      ...acc,
      stt: acc.stt + c.stt,
      exchangeTransactionCharges: acc.exchangeTransactionCharges + c.exchangeTransactionCharges,
      sebiTurnoverFees: acc.sebiTurnoverFees + c.sebiTurnoverFees,
      stampDuty: acc.stampDuty + c.stampDuty,
      otherCharges: acc.otherCharges + c.otherCharges,
      brokerage: acc.brokerage + c.brokerage,
      cgst: acc.cgst + c.cgst,
      sgst: acc.sgst + c.sgst,
      igst: acc.igst + c.igst,
      taxableValue: acc.taxableValue + c.taxableValue,
      netObligation: acc.netObligation + c.netObligation,
      grossObligation: acc.grossObligation + c.grossObligation,
    }),
    {
      grossObligation: 0, stt: 0, exchangeTransactionCharges: 0, sebiTurnoverFees: 0,
      stampDuty: 0, otherCharges: 0, brokerage: 0, cgst: 0, sgst: 0, igst: 0,
      taxableValue: 0, netObligation: 0,
    }
  )

  // ── Per-trade entries ──────────────────────────────────────────────────
  for (const trade of contractNote.trades) {
    const entry = buildTradeEntry(trade, contractNote.tradeDate, brokerLedger, fifoAverageCost)
    entries.push(entry)
  }

  // ── Charges entry (one combined entry for all charges on this contract note) ──
  if (hasAnyCharge(totalCharges)) {
    const chargesEntry = buildChargesEntry(
      contractNote.tradeDate,
      brokerLedger,
      contractNote.contractNoteNo,
      totalCharges
    )
    entries.push(chargesEntry)
  }

  return entries
}

function hasAnyCharge(c: ParsedCharges): boolean {
  return (
    c.stt + c.exchangeTransactionCharges + c.sebiTurnoverFees +
    c.stampDuty + c.otherCharges + c.cgst + c.sgst + c.igst > 0
  )
}

function buildTradeEntry(
  trade: ParsedTrade,
  date: string,
  brokerLedger: string,
  fifoAverageCost?: Record<string, number>
): JournalEntry {
  const errors: string[] = []
  const lines: JournalLine[] = []
  const securityLedger = normalize(trade.securityName)
  const tradeValue = round(trade.quantity * trade.grossRate)
  const brokerage = round(trade.brokeragePerUnit * trade.quantity)

  const isIntraday = trade.productType === 'INTRADAY'
  const isFO = trade.segment === 'FO' || trade.instrumentType === 'FUT'
    || trade.instrumentType === 'CE' || trade.instrumentType === 'PE'
  const isCurrency = trade.segment === 'CDS'

  const narration = `${trade.tradeType} ${trade.quantity} ${securityLedger} @ ₹${trade.grossRate} [${trade.exchange}-${trade.segment}] CN: via ${brokerLedger}`

  if (isIntraday || isFO || isCurrency) {
    // Speculative / F&O — use trading account, no stock movement
    const tradingLedger = isFO || isCurrency
      ? `F&O Trading A/c`
      : `Speculative Trading A/c`
    const tradingGroup = LEDGER_GROUPS.foTrading

    if (trade.tradeType === 'BUY') {
      lines.push(ledgerLine(tradingLedger, tradingGroup, tradeValue, 0, false, narration))
      if (brokerage > 0)
        lines.push(ledgerLine('Brokerage on Shares', LEDGER_GROUPS.brokerage, brokerage, 0))
      lines.push(ledgerLine(brokerLedger, LEDGER_GROUPS.broker, 0, tradeValue + brokerage, true))
    } else {
      lines.push(ledgerLine(brokerLedger, LEDGER_GROUPS.broker, tradeValue - brokerage, 0, true))
      if (brokerage > 0)
        lines.push(ledgerLine('Brokerage on Shares', LEDGER_GROUPS.brokerage, brokerage, 0))
      lines.push(ledgerLine(tradingLedger, tradingGroup, 0, tradeValue, false, narration))
    }
  } else {
    // Delivery equity (including MTF)
    if (trade.tradeType === 'BUY') {
      lines.push(ledgerLine(securityLedger, LEDGER_GROUPS.stock, tradeValue, 0, false, narration))
      if (brokerage > 0)
        lines.push(ledgerLine('Brokerage on Shares', LEDGER_GROUPS.brokerage, brokerage, 0))
      lines.push(ledgerLine(brokerLedger, LEDGER_GROUPS.broker, 0, tradeValue + brokerage, true))
    } else {
      // SELL — need cost basis to compute capital gain/loss
      const costPerShare = fifoAverageCost?.[trade.isin ?? securityLedger] ?? 0
      const costBasis = round(costPerShare * trade.quantity)
      const saleProceeds = round(tradeValue - brokerage)
      const gain = round(saleProceeds - costBasis)

      lines.push(ledgerLine(brokerLedger, LEDGER_GROUPS.broker, saleProceeds, 0, true))
      if (brokerage > 0)
        lines.push(ledgerLine('Brokerage on Shares', LEDGER_GROUPS.brokerage, brokerage, 0))
      if (costBasis > 0) {
        lines.push(ledgerLine(securityLedger, LEDGER_GROUPS.stock, 0, costBasis, false, narration))
        if (gain >= 0) {
          lines.push(ledgerLine('Short Term Capital Gains', LEDGER_GROUPS.stcg, 0, gain))
        } else {
          lines.push(ledgerLine('Short Term Capital Loss', LEDGER_GROUPS.stcl, Math.abs(gain), 0))
        }
      } else {
        // No cost basis available — post full sale to stock, flag for review
        lines.push(ledgerLine(securityLedger, LEDGER_GROUPS.stock, 0, saleProceeds, false, narration))
        errors.push(`Cost basis not found for ${securityLedger}. Capital gain/loss not computed. Set cost in Holdings.`)
      }
    }
  }

  return finalizeEntry(date, 'Journal', narration, lines, errors)
}

function buildChargesEntry(
  date: string,
  brokerLedger: string,
  contractNoteNo: string,
  c: ParsedCharges
): JournalEntry {
  const lines: JournalLine[] = []
  const narration = `Charges on Contract Note ${contractNoteNo} — ${brokerLedger}`

  // Expense debits
  if (c.stt > 0) lines.push(ledgerLine('Securities Transaction Tax (STT)', LEDGER_GROUPS.stt, c.stt, 0))
  if (c.exchangeTransactionCharges > 0) lines.push(ledgerLine('Exchange Transaction Charges', LEDGER_GROUPS.exchangeCharges, c.exchangeTransactionCharges, 0))
  if (c.sebiTurnoverFees > 0) lines.push(ledgerLine('SEBI Turnover Fees', LEDGER_GROUPS.sebiCharges, c.sebiTurnoverFees, 0))
  if (c.stampDuty > 0) lines.push(ledgerLine('Stamp Duty', LEDGER_GROUPS.stampDuty, c.stampDuty, 0))
  if (c.otherCharges > 0) lines.push(ledgerLine('Other Charges (Exchange)', LEDGER_GROUPS.exchangeCharges, c.otherCharges, 0))

  // GST — debit as input tax credit if GST registered, else as expense
  if (c.cgst > 0) lines.push(ledgerLine('Input CGST', LEDGER_GROUPS.cgst, c.cgst, 0))
  if (c.sgst > 0) lines.push(ledgerLine('Input SGST', LEDGER_GROUPS.sgst, c.sgst, 0))
  if (c.igst > 0) lines.push(ledgerLine('Input IGST', LEDGER_GROUPS.igst, c.igst, 0))

  // Broker credits the client for net (gross sale - all charges) or debits for net buy
  const totalExpense = round(
    c.stt + c.exchangeTransactionCharges + c.sebiTurnoverFees +
    c.stampDuty + c.otherCharges + c.cgst + c.sgst + c.igst
  )
  if (totalExpense > 0) {
    lines.push(ledgerLine(brokerLedger, LEDGER_GROUPS.broker, 0, totalExpense, true, narration))
  }

  return finalizeEntry(date, 'Journal', narration, lines, [])
}

function finalizeEntry(
  date: string,
  voucherType: 'Journal',
  narration: string,
  lines: JournalLine[],
  errors: string[]
): JournalEntry {
  const totalDebit = round(lines.reduce((s, l) => s + l.debit, 0))
  const totalCredit = round(lines.reduce((s, l) => s + l.credit, 0))
  const diff = Math.abs(totalDebit - totalCredit)
  const isBalanced = diff < 0.02  // allow 1 paisa rounding

  if (!isBalanced) {
    errors.push(`Entry is unbalanced: Dr ₹${totalDebit} ≠ Cr ₹${totalCredit} (diff ₹${diff.toFixed(2)})`)
  }

  return { date, voucherType, narration, lines, isBalanced, totalDebit, totalCredit, validationErrors: errors }
}
