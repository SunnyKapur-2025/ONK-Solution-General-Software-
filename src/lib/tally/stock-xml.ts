/**
 * Generates TallyPrime-compatible XML (TALLYMESSAGE format) for stock journal entries.
 * Compatible with TallyPrime 3.x and above.
 * Import via: Tally Gateway → Import Data → Vouchers → select XML file
 */

import type { JournalEntry, JournalLine } from '../accounting/stock-journal'

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function tallyDate(isoDate: string): string {
  // YYYY-MM-DD → YYYYMMDD
  return isoDate.replace(/-/g, '')
}

function amount(n: number): string {
  return Math.abs(n).toFixed(2)
}

function ledgerEntry(line: JournalLine): string {
  const isDebit = line.debit > 0
  const amt = isDebit ? line.debit : line.credit
  const drCr = isDebit ? 'Dr' : 'Cr'
  return `
      <ALLLEDGERENTRIES.LIST>
        <LEDGERNAME>${escape(line.ledgerName)}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
        <LEDGERFROMITEM>No</LEDGERFROMITEM>
        <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
        <ISPARTYLEDGER>${line.isParty ? 'Yes' : 'No'}</ISPARTYLEDGER>
        <ISLASTDEEMEDPOSITIVE>${isDebit ? 'Yes' : 'No'}</ISLASTDEEMEDPOSITIVE>
        <AMOUNT>${drCr === 'Dr' ? '' : '-'}${amount(amt)}</AMOUNT>
        <NARRATION>${escape(line.narration ?? '')}</NARRATION>
      </ALLLEDGERENTRIES.LIST>`
}

function voucherXML(entry: JournalEntry, companyName: string): string {
  const linesXML = entry.lines.map(ledgerEntry).join('')
  return `
    <VOUCHER REMOTEID="" VCHTYPE="Journal" ACTION="Create" OBJVIEW="Journal Voucher View">
      <DATE>${tallyDate(entry.date)}</DATE>
      <GUID></GUID>
      <NARRATION>${escape(entry.narration)}</NARRATION>
      <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
      <VOUCHERNUMBER></VOUCHERNUMBER>
      <PARTYLEDGERNAME></PARTYLEDGERNAME>
      <CSTFORMISSUEDNO></CSTFORMISSUEDNO>
      <CSTFORMRECEIVEDNO></CSTFORMRECEIVEDNO>
      ${linesXML}
    </VOUCHER>`
}

export function generateTallyXML(
  entries: JournalEntry[],
  companyName: string
): string {
  const vouchers = entries.map(e => voucherXML(e, companyName)).join('\n')
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
          <SVCURRENTCOMPANY>${escape(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          ${vouchers}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`
}

/**
 * Also generates ledger master creation XML so Tally auto-creates
 * any ledgers that don't exist yet.
 */
export function generateLedgerMastersXML(
  entries: JournalEntry[],
  companyName: string
): string {
  const seen = new Set<string>()
  const ledgers: JournalLine[] = []

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (!seen.has(line.ledgerName)) {
        seen.add(line.ledgerName)
        ledgers.push(line)
      }
    }
  }

  const masters = ledgers.map(l => `
        <LEDGER NAME="${escape(l.ledgerName)}" ACTION="Create">
          <NAME>${escape(l.ledgerName)}</NAME>
          <PARENT>${escape(l.ledgerGroup)}</PARENT>
          <ISBILLWISEON>${l.isParty ? 'Yes' : 'No'}</ISBILLWISEON>
          <AFFECTSSTOCK>No</AFFECTSSTOCK>
        </LEDGER>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escape(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          ${masters}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`
}
