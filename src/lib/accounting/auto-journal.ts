/**
 * Auto-Journal Engine
 *
 * Users never see debits or credits.
 * Every transaction type maps to a fixed accounting rule.
 * This module converts plain-language inputs into balanced journal entries.
 */

export type TransactionType =
  | 'sale'          // Money earned from selling goods/services
  | 'purchase'      // Goods/services bought from a vendor
  | 'receipt'       // Money received (against a sale or advance)
  | 'payment'       // Money paid out (against a purchase or expense)
  | 'expense'       // Direct expense (rent, salary, electricity, etc.)
  | 'contra'        // Cash ↔ Bank transfer

export interface AutoJournalInput {
  type: TransactionType
  date: string
  narration: string
  amount: number          // Base amount before tax
  cgst?: number
  sgst?: number
  igst?: number
  partyAccountId?: string // Customer or Vendor account
  ledgerAccountId: string // Income/Expense/Stock account
  settlementAccountId: string // Bank or Cash account
  reference?: string
}

export interface JournalLineInput {
  accountId: string
  debit: number
  credit: number
  narration?: string
  partyId?: string
}

/**
 * Returns balanced journal lines for any transaction type.
 * The caller only provides business context — never debit/credit.
 */
export function buildJournalLines(input: AutoJournalInput): JournalLineInput[] {
  const { type, amount, cgst = 0, sgst = 0, igst = 0 } = input
  const taxTotal = cgst + sgst + igst
  const grossAmount = amount + taxTotal

  switch (type) {
    case 'sale': {
      /**
       * Sale entry:
       *   DR  Debtor / Bank / Cash       (gross amount)
       *   CR  Sales / Service Income     (base amount)
       *   CR  Output CGST Payable        (cgst)
       *   CR  Output SGST Payable        (sgst)
       *   CR  Output IGST Payable        (igst)
       */
      const lines: JournalLineInput[] = [
        { accountId: input.partyAccountId || input.settlementAccountId, debit: grossAmount, credit: 0 },
        { accountId: input.ledgerAccountId, debit: 0, credit: amount },
      ]
      if (cgst > 0) lines.push({ accountId: 'OUTPUT_CGST', debit: 0, credit: cgst })
      if (sgst > 0) lines.push({ accountId: 'OUTPUT_SGST', debit: 0, credit: sgst })
      if (igst > 0) lines.push({ accountId: 'OUTPUT_IGST', debit: 0, credit: igst })
      return lines
    }

    case 'purchase': {
      /**
       * Purchase entry:
       *   DR  Purchase / Expense Account (base amount)
       *   DR  Input CGST Receivable      (cgst)
       *   DR  Input SGST Receivable      (sgst)
       *   DR  Input IGST Receivable      (igst)
       *   CR  Creditor / Bank / Cash     (gross amount)
       */
      const lines: JournalLineInput[] = [
        { accountId: input.ledgerAccountId, debit: amount, credit: 0 },
      ]
      if (cgst > 0) lines.push({ accountId: 'INPUT_CGST', debit: cgst, credit: 0 })
      if (sgst > 0) lines.push({ accountId: 'INPUT_SGST', debit: sgst, credit: 0 })
      if (igst > 0) lines.push({ accountId: 'INPUT_IGST', debit: igst, credit: 0 })
      lines.push({ accountId: input.partyAccountId || input.settlementAccountId, debit: 0, credit: grossAmount })
      return lines
    }

    case 'receipt': {
      /**
       * Money received against a sale:
       *   DR  Bank / Cash               (amount)
       *   CR  Debtor                    (amount)
       */
      return [
        { accountId: input.settlementAccountId, debit: amount, credit: 0 },
        { accountId: input.partyAccountId!, debit: 0, credit: amount },
      ]
    }

    case 'payment': {
      /**
       * Money paid against a purchase/bill:
       *   DR  Creditor                  (amount)
       *   CR  Bank / Cash              (amount)
       */
      return [
        { accountId: input.partyAccountId!, debit: amount, credit: 0 },
        { accountId: input.settlementAccountId, debit: 0, credit: amount },
      ]
    }

    case 'expense': {
      /**
       * Direct expense (rent, salary, etc.):
       *   DR  Expense Account           (amount)
       *   CR  Bank / Cash              (amount)
       */
      return [
        { accountId: input.ledgerAccountId, debit: amount, credit: 0 },
        { accountId: input.settlementAccountId, debit: 0, credit: amount },
      ]
    }

    case 'contra': {
      /**
       * Cash to Bank or Bank to Cash:
       *   DR  Destination account       (amount)
       *   CR  Source account            (amount)
       */
      return [
        { accountId: input.settlementAccountId, debit: amount, credit: 0 },
        { accountId: input.ledgerAccountId, debit: 0, credit: amount },
      ]
    }
  }
}

/** Verify a set of lines is balanced before saving */
export function isBalanced(lines: JournalLineInput[]): boolean {
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0)
  return Math.abs(totalDebit - totalCredit) < 0.01
}
