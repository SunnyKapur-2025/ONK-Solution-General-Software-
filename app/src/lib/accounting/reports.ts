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
  income: AccountBalance[]
  directExpenses: AccountBalance[]
  indirectExpenses: AccountBalance[]
  grossProfit: number
  netProfit: number
  totalIncome: number
  totalExpenses: number
}

export interface BalanceSheetReport {
  asOnDate: string
  assets: {
    fixedAssets: AccountBalance[]
    currentAssets: AccountBalance[]
    totalFixedAssets: number
    totalCurrentAssets: number
    totalAssets: number
  }
  liabilitiesAndEquity: {
    equity: AccountBalance[]
    longTermLiabilities: AccountBalance[]
    currentLiabilities: AccountBalance[]
    totalEquity: number
    totalLongTerm: number
    totalCurrentLiabilities: number
    totalLiabilitiesAndEquity: number
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

export function computePnL(
  balances: Array<{ accountId: string; accountCode: string; accountName: string; type: string; subType: string; debitTotal: number; creditTotal: number }>,
  fromDate: string,
  toDate: string
): PnLReport {
  const income: AccountBalance[] = []
  const directExpenses: AccountBalance[] = []
  const indirectExpenses: AccountBalance[] = []

  for (const b of balances) {
    const balance = netBalance(b.debitTotal, b.creditTotal, b.type)
    const entry: AccountBalance = { ...b, balance, normalBalance: normalBalance(b.type) }

    if (b.type === 'income') {
      income.push(entry)
    } else if (b.type === 'expense') {
      if (b.subType === 'direct_expense') directExpenses.push(entry)
      else indirectExpenses.push(entry)
    }
  }

  const totalIncome = income.reduce((s, a) => s + a.balance, 0)
  const totalDirect = directExpenses.reduce((s, a) => s + a.balance, 0)
  const totalIndirect = indirectExpenses.reduce((s, a) => s + a.balance, 0)
  const grossProfit = totalIncome - totalDirect
  const netProfit = grossProfit - totalIndirect

  return {
    fromDate,
    toDate,
    income,
    directExpenses,
    indirectExpenses,
    grossProfit,
    netProfit,
    totalIncome,
    totalExpenses: totalDirect + totalIndirect,
  }
}

export function computeBalanceSheet(
  balances: Array<{ accountId: string; accountCode: string; accountName: string; type: string; subType: string; debitTotal: number; creditTotal: number }>,
  retainedEarnings: number,
  asOnDate: string
): BalanceSheetReport {
  const fixedAssets: AccountBalance[] = []
  const currentAssets: AccountBalance[] = []
  const equity: AccountBalance[] = []
  const longTermLiabilities: AccountBalance[] = []
  const currentLiabilities: AccountBalance[] = []

  for (const b of balances) {
    const balance = netBalance(b.debitTotal, b.creditTotal, b.type)
    if (balance === 0) continue
    const entry: AccountBalance = { ...b, balance, normalBalance: normalBalance(b.type) }

    if (b.type === 'asset') {
      if (b.subType === 'fixed_asset') fixedAssets.push(entry)
      else currentAssets.push(entry)
    } else if (b.type === 'liability') {
      if (b.subType === 'long_term_loan') longTermLiabilities.push(entry)
      else currentLiabilities.push(entry)
    } else if (b.type === 'equity') {
      equity.push(entry)
    }
  }

  // Add retained earnings as equity line
  if (retainedEarnings !== 0) {
    equity.push({
      accountId: 'retained',
      accountCode: '3200',
      accountName: 'Profit / (Loss) for the Period',
      type: 'equity',
      subType: 'retained',
      debitTotal: retainedEarnings < 0 ? Math.abs(retainedEarnings) : 0,
      creditTotal: retainedEarnings > 0 ? retainedEarnings : 0,
      balance: retainedEarnings,
      normalBalance: 'cr',
    })
  }

  const totalFixedAssets = fixedAssets.reduce((s, a) => s + a.balance, 0)
  const totalCurrentAssets = currentAssets.reduce((s, a) => s + a.balance, 0)
  const totalAssets = totalFixedAssets + totalCurrentAssets

  const totalEquity = equity.reduce((s, a) => s + a.balance, 0)
  const totalLongTerm = longTermLiabilities.reduce((s, a) => s + a.balance, 0)
  const totalCurrentLiabilities = currentLiabilities.reduce((s, a) => s + a.balance, 0)
  const totalLiabilitiesAndEquity = totalEquity + totalLongTerm + totalCurrentLiabilities

  const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity)

  return {
    asOnDate,
    assets: { fixedAssets, currentAssets, totalFixedAssets, totalCurrentAssets, totalAssets },
    liabilitiesAndEquity: { equity, longTermLiabilities, currentLiabilities, totalEquity, totalLongTerm, totalCurrentLiabilities, totalLiabilitiesAndEquity },
    isBalanced: difference < 0.05,
    difference,
  }
}
