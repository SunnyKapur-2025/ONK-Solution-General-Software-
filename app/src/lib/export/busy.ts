/**
 * Busy Accounting Export
 * Produces CSV in Busy's standard voucher import format
 */

export interface BusyVoucher {
  date: string           // DD/MM/YYYY
  voucherType: string    // 'Sales' | 'Purchase' | 'Receipt' | 'Payment' | 'Journal' | 'Contra'
  voucherNumber: string
  narration: string
  partyName?: string
  ledgerName: string
  debit: number
  credit: number
  cgst?: number
  sgst?: number
  igst?: number
  reference?: string
}

function formatBusyDate(dateStr: string): string {
  // Convert YYYY-MM-DD to DD/MM/YYYY
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function csvRow(fields: (string | number)[]): string {
  return fields
    .map((f) => {
      const str = String(f)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    })
    .join(',')
}

export function generateBusyCsv(vouchers: BusyVoucher[]): string {
  const header = csvRow([
    'Date', 'Voucher Type', 'Voucher No', 'Party Name', 'Ledger Name',
    'Debit', 'Credit', 'CGST', 'SGST', 'IGST', 'Narration', 'Reference',
  ])

  const rows = vouchers.map((v) =>
    csvRow([
      formatBusyDate(v.date),
      v.voucherType,
      v.voucherNumber,
      v.partyName || '',
      v.ledgerName,
      v.debit.toFixed(2),
      v.credit.toFixed(2),
      (v.cgst || 0).toFixed(2),
      (v.sgst || 0).toFixed(2),
      (v.igst || 0).toFixed(2),
      v.narration,
      v.reference || '',
    ])
  )

  return [header, ...rows].join('\n')
}
