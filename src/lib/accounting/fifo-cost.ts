/**
 * FIFO (First In, First Out) cost basis calculator for stock holdings.
 * Used to determine cost of shares sold for capital gains computation.
 */

export interface FIFOLot {
  date: string
  quantity: number
  costPerShare: number
}

export interface FIFOResult {
  costOfSharesSold: number
  remainingLots: FIFOLot[]
  warnings: string[]
}

export function computeFIFOCost(
  lots: FIFOLot[],          // existing holding lots, oldest first
  sellQuantity: number
): FIFOResult {
  const warnings: string[] = []
  const remaining = lots.map(l => ({ ...l }))  // deep copy
  let qtyToSell = sellQuantity
  let totalCost = 0

  for (const lot of remaining) {
    if (qtyToSell <= 0) break
    if (lot.quantity <= 0) continue

    const consumed = Math.min(lot.quantity, qtyToSell)
    totalCost += consumed * lot.costPerShare
    lot.quantity -= consumed
    qtyToSell -= consumed
  }

  if (qtyToSell > 0) {
    warnings.push(
      `Sold ${qtyToSell} more shares than recorded in holdings. Possible: short-sell, imported trade missing, or holdings not yet seeded.`
    )
  }

  return {
    costOfSharesSold: Math.round(totalCost * 100) / 100,
    remainingLots: remaining.filter(l => l.quantity > 0),
    warnings,
  }
}

export function averageCostPerShare(lots: FIFOLot[]): number {
  const totalQty = lots.reduce((s, l) => s + l.quantity, 0)
  const totalCost = lots.reduce((s, l) => s + l.quantity * l.costPerShare, 0)
  if (totalQty === 0) return 0
  return Math.round((totalCost / totalQty) * 100) / 100
}
