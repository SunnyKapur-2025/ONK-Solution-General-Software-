/**
 * Report computation engine
 * Reads posted journal lines and produces P&L, Balance Sheet, and Aging.
 * All monetary values in INR, stored as numbers with 2 decimal precision.
 */

export interface AccountBalance {
  accountId: string
  accountCode: string
  accountName: string
  type: string
  subType: string
  debitTotal: number
  creditTotal: number
  balance: number          // net balance (debit - credit for assets/expenses, credit - debit for liabilities/income)
  normalBalance: 'dr' | 'cr'
}

export interface PnLReport {
  fromDate: string
  toDate: string
  // NCE Section I — Revenue from operations
  revenueFromOperations: AccountBalance[]
  // NCE Section II — Other income
  otherIncome: AccountBalance[]
  // NCE Section IV sub-categories
  costOfGoodsSold: AccountBalance[]
  employeeBenefits: AccountBalance[]
  financeCosts: AccountBalance[]
  depreciation: AccountBalance[]
  otherExpenses: AccountBalance[]
  // Totals
  totalRevenue: number
  totalOtherIncome: number
  totalIncome: number
  totalCogs: number
  totalEmployeeBenefits: number
  totalFinanceCosts: number
  totalDepreciation: number
  totalOtherExpenses: number
  totalExpenses: number
  profitBeforeTax: number
  netProfit: number
  // Legacy fields (kept for compatibility)
  income: AccountBalance[]
  directExpenses: AccountBalance[]
  indirectExpenses: AccountBalance[]
  grossProfit: number
}

// ── Schedule III — Companies Act 2013 ────────────────────────────────────────

/**
 * Maps an account's sub_type to its Schedule III position.
 * side: which half of the balance sheet
 * part: Roman numeral heading (I / II / III)
 * item: camelCase key for the line item
 */
const SCHEDULE3_MAP: Record<string, { side: 'equity_liabilities' | 'assets'; part: string; item: string }> = {
  // Assets — Part I (Non-Current Assets)
  'fixed_asset':          { side: 'assets', part: 'I', item: 'a_fixed_assets' },
  'intangible_asset':     { side: 'assets', part: 'I', item: 'a_intangible_assets' },
  'capital_wip':          { side: 'assets', part: 'I', item: 'a_cwip' },
  'investment_lt':        { side: 'assets', part: 'I', item: 'b_investments' },
  'loans_advances_lt':    { side: 'assets', part: 'I', item: 'c_loans_advances' },
  'other_noncurrent':     { side: 'assets', part: 'I', item: 'd_other_noncurrent' },
  // Assets — Part II (Current Assets)
  'inventory':            { side: 'assets', part: 'II', item: 'b_inventories' },
  'receivable':           { side: 'assets', part: 'II', item: 'c_trade_receivables' },
  'bank':                 { side: 'assets', part: 'II', item: 'd_cash_bank' },
  'cash':                 { side: 'assets', part: 'II', item: 'd_cash_bank' },
  'loans_advances_st':    { side: 'assets', part: 'II', item: 'e_loans_advances_st' },
  'other_current':        { side: 'assets', part: 'II', item: 'f_other_current' },
  // Equity & Liabilities — Part I (Shareholders' Funds)
  'share_capital':        { side: 'equity_liabilities', part: 'I', item: 'a_share_capital' },
  'capital':              { side: 'equity_liabilities', part: 'I', item: 'a_share_capital' },
  'reserves':             { side: 'equity_liabilities', part: 'I', item: 'b_reserves_surplus' },
  'retained_earnings':    { side: 'equity_liabilities', part: 'I', item: 'b_reserves_surplus' },
  // Equity & Liabilities — Part II (Non-Current Liabilities)
  'long_term_loan':       { side: 'equity_liabilities', part: 'II', item: 'a_lt_borrowings' },
  'deferred_tax':         { side: 'equity_liabilities', part: 'II', item: 'b_deferred_tax' },
  'other_lt_liability':   { side: 'equity_liabilities', part: 'II', item: 'c_other_lt_liabilities' },
  'lt_provision':         { side: 'equity_liabilities', part: 'II', item: 'd_lt_provisions' },
  // Equity & Liabilities — Part III (Current Liabilities)
  'short_term_borrowing': { side: 'equity_liabilities', part: 'III', item: 'a_st_borrowings' },
  'payable':              { side: 'equity_liabilities', part: 'III', item: 'b_trade_payables' },
  'other_current_liability': { side: 'equity_liabilities', part: 'III', item: 'c_other_cl' },
  'st_provision':         { side: 'equity_liabilities', part: 'III', item: 'd_st_provisions' },
}

/** Fallback mapping for legacy sub_types not in SCHEDULE3_MAP */
function fallbackMapping(type: string, subType: string): { side: 'equity_liabilities' | 'assets'; part: string; item: string } | null {
  if (type === 'asset') return { side: 'assets', part: 'II', item: 'f_other_current' }
  if (type === 'liability') return { side: 'equity_liabilities', part: 'III', item: 'c_other_cl' }
  if (type === 'equity') return { side: 'equity_liabilities', part: 'I', item: 'b_reserves_surplus' }
  return null
}

// Line item labels for display (NCE — Non-Corporate Entity format per ICAI Guidance Note)
export const SCHEDULE3_LABELS: Record<string, string> = {
  'a_share_capital':      "(a) Owner's Capital Account",
  'b_reserves_surplus':   '(b) Reserves and Surplus / Undistributed Surplus',
  'a_lt_borrowings':      '(a) Long-term Borrowings',
  'b_deferred_tax':       '(b) Deferred Tax Liabilities (Net)',
  'c_other_lt_liabilities': '(c) Other Long-term Liabilities',
  'd_lt_provisions':      '(d) Long-term Provisions',
  'a_st_borrowings':      '(a) Short-term Borrowings',
  'b_trade_payables':     '(b) Trade Payables',
  'c_other_cl':           '(c) Other Current Liabilities',
  'd_st_provisions':      '(d) Short-term Provisions',
  'a_fixed_assets':       '(a) Tangible Assets',
  'a_intangible_assets':  '(a) Intangible Assets',
  'a_cwip':               '(a) Capital Work-in-Progress',
  'b_investments':        '(b) Non-Current Investments',
  'c_loans_advances':     '(c) Long-term Loans and Advances',
  'd_other_noncurrent':   '(d) Other Non-Current Assets',
  'b_inventories':        '(b) Inventories',
  'c_trade_receivables':  '(c) Trade Receivables',
  'd_cash_bank':          '(d) Cash and Cash Equivalents',
  'e_loans_advances_st':  '(e) Short-term Loans and Advances',
  'f_other_current':      '(f) Other Current Assets',
}

export interface ScheduleIIILineItem {
  item: string          // key like 'a_share_capital'
  label: string         // human-readable label
  accounts: AccountBalance[]
  total: number
}

export interface ScheduleIIIPart {
  part: string          // 'I', 'II', 'III'
  heading: string
  items: ScheduleIIILineItem[]
  total: number
}

export interface BalanceSheetReport {
  asOnDate: string
  equityAndLiabilities: {
    parts: ScheduleIIIPart[]  // Parts I, II, III
    total: number
  }
  assets: {
    parts: ScheduleIIIPart[]  // Parts I, II
    total: number
  }
  isBalanced: boolean
  difference: number
}

export interface AgingBucket {
  partyId: string
  partyName: string
  current: number       // 0-30 days
  days31_60: number
  days61_90: number
  days91_180: number
  above180: number
  total: number
}

// Normal balance by account type
function normalBalance(type: string): 'dr' | 'cr' {
  return type === 'asset' || type === 'expense' ? 'dr' : 'cr'
}

function netBalance(debit: number, credit: number, type: string): number {
  return normalBalance(type) === 'dr' ? debit - credit : credit - debit
}

// NCE expense classification by subType
function classifyExpense(subType: string): 'cogs' | 'employee' | 'finance' | 'depreciation' | 'other' {
  if (/direct_expense|cost_of_goods|cogs|material/.test(subType)) return 'cogs'
  if (/salary|employee|payroll|staff|wages/.test(subType)) return 'employee'
  if (/finance|interest|bank_charge/.test(subType)) return 'finance'
  if (/depreciation|amortiz/.test(subType)) return 'depreciation'
  return 'other'
}

export function computePnL(
  balances: Array<{ accountId: string; accountCode: string; accountName: string; type: string; subType: string; debitTotal: number; creditTotal: number }>,
  fromDate: string,
  toDate: string
): PnLReport {
  const revenueFromOperations: AccountBalance[] = []
  const otherIncome: AccountBalance[] = []
  const costOfGoodsSold: AccountBalance[] = []
  const employeeBenefits: AccountBalance[] = []
  const financeCosts: AccountBalance[] = []
  const depreciation: AccountBalance[] = []
  const otherExpenses: AccountBalance[] = []
  // Legacy
  const income: AccountBalance[] = []
  const directExpenses: AccountBalance[] = []
  const indirectExpenses: AccountBalance[] = []

  for (const b of balances) {
    const balance = netBalance(b.debitTotal, b.creditTotal, b.type)
    const entry: AccountBalance = { ...b, balance, normalBalance: normalBalance(b.type) }

    if (b.type === 'income') {
      income.push(entry)
      if (/other_income|interest|dividend|gain/.test(b.subType)) otherIncome.push(entry)
      else revenueFromOperations.push(entry)
    } else if (b.type === 'expense') {
      if (b.subType === 'direct_expense') directExpenses.push(entry)
      else indirectExpenses.push(entry)

      const cls = classifyExpense(b.subType)
      if (cls === 'cogs') costOfGoodsSold.push(entry)
      else if (cls === 'employee') employeeBenefits.push(entry)
      else if (cls === 'finance') financeCosts.push(entry)
      else if (cls === 'depreciation') depreciation.push(entry)
      else otherExpenses.push(entry)
    }
  }

  const totalRevenue = revenueFromOperations.reduce((s, a) => s + a.balance, 0)
  const totalOtherIncome = otherIncome.reduce((s, a) => s + a.balance, 0)
  const totalIncome = totalRevenue + totalOtherIncome
  const totalCogs = costOfGoodsSold.reduce((s, a) => s + a.balance, 0)
  const totalEmployeeBenefits = employeeBenefits.reduce((s, a) => s + a.balance, 0)
  const totalFinanceCosts = financeCosts.reduce((s, a) => s + a.balance, 0)
  const totalDepreciation = depreciation.reduce((s, a) => s + a.balance, 0)
  const totalOtherExpenses = otherExpenses.reduce((s, a) => s + a.balance, 0)
  const totalExpenses = totalCogs + totalEmployeeBenefits + totalFinanceCosts + totalDepreciation + totalOtherExpenses
  const profitBeforeTax = totalIncome - totalExpenses
  // Legacy
  const totalDirect = directExpenses.reduce((s, a) => s + a.balance, 0)
  const totalIndirect = indirectExpenses.reduce((s, a) => s + a.balance, 0)
  const grossProfit = totalIncome - totalDirect

  return {
    fromDate,
    toDate,
    revenueFromOperations,
    otherIncome,
    costOfGoodsSold,
    employeeBenefits,
    financeCosts,
    depreciation,
    otherExpenses,
    totalRevenue,
    totalOtherIncome,
    totalIncome,
    totalCogs,
    totalEmployeeBenefits,
    totalFinanceCosts,
    totalDepreciation,
    totalOtherExpenses,
    totalExpenses,
    profitBeforeTax,
    netProfit: profitBeforeTax,
    // Legacy
    income,
    directExpenses,
    indirectExpenses,
    grossProfit,
  }
}

function buildPart(
  part: string,
  heading: string,
  itemMap: Map<string, AccountBalance[]>
): ScheduleIIIPart {
  const items: ScheduleIIILineItem[] = []
  for (const [item, accounts] of itemMap.entries()) {
    const total = accounts.reduce((s, a) => s + a.balance, 0)
    items.push({ item, label: SCHEDULE3_LABELS[item] ?? item, accounts, total })
  }
  const total = items.reduce((s, i) => s + i.total, 0)
  return { part, heading, items, total }
}

export function computeBalanceSheet(
  balances: Array<{ accountId: string; accountCode: string; accountName: string; type: string; subType: string; debitTotal: number; creditTotal: number }>,
  retainedEarnings: number,
  asOnDate: string
): BalanceSheetReport {
  // Buckets: side -> part -> item -> accounts[]
  const buckets: Record<string, Record<string, Map<string, AccountBalance[]>>> = {
    equity_liabilities: {
      I: new Map(),
      II: new Map(),
      III: new Map(),
    },
    assets: {
      I: new Map(),
      II: new Map(),
    },
  }

  for (const b of balances) {
    const balance = netBalance(b.debitTotal, b.creditTotal, b.type)
    if (balance === 0) continue
    const entry: AccountBalance = { ...b, balance, normalBalance: normalBalance(b.type) }

    const mapping = SCHEDULE3_MAP[b.subType] ?? fallbackMapping(b.type, b.subType)
    if (!mapping) continue  // income/expense accounts — skip

    const partMap = buckets[mapping.side][mapping.part]
    if (!partMap) continue
    if (!partMap.has(mapping.item)) partMap.set(mapping.item, [])
    partMap.get(mapping.item)!.push(entry)
  }

  // Inject retained earnings into Reserves & Surplus
  if (retainedEarnings !== 0) {
    const reEntry: AccountBalance = {
      accountId: 'retained',
      accountCode: '3200',
      accountName: 'Profit / (Loss) for the Period',
      type: 'equity',
      subType: 'retained_earnings',
      debitTotal: retainedEarnings < 0 ? Math.abs(retainedEarnings) : 0,
      creditTotal: retainedEarnings > 0 ? retainedEarnings : 0,
      balance: retainedEarnings,
      normalBalance: 'cr',
    }
    const elI = buckets.equity_liabilities['I']
    if (!elI.has('b_reserves_surplus')) elI.set('b_reserves_surplus', [])
    elI.get('b_reserves_surplus')!.push(reEntry)
  }

  // Build equity & liabilities parts (NCE — Non-Corporate Entity headings)
  const elParts: ScheduleIIIPart[] = [
    buildPart('I', "Owner's Funds", buckets.equity_liabilities['I']),
    buildPart('II', 'Non-Current Liabilities', buckets.equity_liabilities['II']),
    buildPart('III', 'Current Liabilities', buckets.equity_liabilities['III']),
  ]
  const totalEL = elParts.reduce((s, p) => s + p.total, 0)

  // Build assets parts
  const assetParts: ScheduleIIIPart[] = [
    buildPart('I', 'Non-Current Assets', buckets.assets['I']),
    buildPart('II', 'Current Assets', buckets.assets['II']),
  ]
  const totalAssets = assetParts.reduce((s, p) => s + p.total, 0)

  const difference = Math.abs(totalAssets - totalEL)

  return {
    asOnDate,
    equityAndLiabilities: { parts: elParts, total: totalEL },
    assets: { parts: assetParts, total: totalAssets },
    isBalanced: difference < 0.05,
    difference,
  }
}
