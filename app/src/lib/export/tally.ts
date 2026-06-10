/**
 * Tally XML Export
 * Produces TallyPrime-compatible XML (TALLYMESSAGE format)
 * Works with both Tally ERP 9 and Tally Prime
 */

export interface TallyVoucher {
  date: string          // YYYYMMDD
  voucherType: string   // 'Sales' | 'Purchase' | 'Receipt' | 'Payment' | 'Journal' | 'Contra'
  voucherNumber: string
  narration: string
  reference?: string
  lines: TallyLedgerEntry[]
}

export interface TallyLedgerEntry {
  ledgerName: string
  amount: number        // positive = debit, negative = credit (Tally convention)
  isDeemedPositive: boolean
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatTallyDate(dateStr: string): string {
  // Convert YYYY-MM-DD to YYYYMMDD
  return dateStr.replace(/-/g, '')
}

function voucherTypeTag(type: string): string {
  const map: Record<string, string> = {
    Sales: 'Sales',
    Purchase: 'Purchase',
    Receipt: 'Receipt',
    Payment: 'Payment',
    Journal: 'Journal',
    Contra: 'Contra',
    'Credit Note': 'Credit Note',
    'Debit Note': 'Debit Note',
  }
  return map[type] || 'Journal'
}

function buildVoucherXml(v: TallyVoucher): string {
  const lines = v.lines.map((line) => `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escapeXml(line.ledgerName)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${line.isDeemedPositive ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
        <AMOUNT>${line.amount.toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`).join('')

  return `
  <VOUCHER VCHTYPE="${escapeXml(v.voucherType)}" ACTION="Create">
    <DATE>${formatTallyDate(v.date)}</DATE>
    <VOUCHERTYPENAME>${escapeXml(voucherTypeTag(v.voucherType))}</VOUCHERTYPENAME>
    <VOUCHERNUMBER>${escapeXml(v.voucherNumber)}</VOUCHERNUMBER>
    <NARRATION>${escapeXml(v.narration)}</NARRATION>
    ${v.reference ? `<REFERENCE>${escapeXml(v.reference)}</REFERENCE>` : ''}${lines}
  </VOUCHER>`
}

export function generateTallyXml(
  companyName: string,
  vouchers: TallyVoucher[]
): string {
  const voucherXml = vouchers.map(buildVoucherXml).join('')
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">${voucherXml}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`
}
