export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

interface BankTransaction {
  date: string
  description: string
  debit: number
  credit: number
  balance: number
}

// Parse an Indian-format amount string like "INR 82,588.00" or "82,588.00"
function parseAmount(s: string): number {
  if (!s) return 0
  return parseFloat(s.replace(/INR\s*/gi, '').replace(/,/g, '').trim()) || 0
}

// Indian Bank / most Indian bank PDF text layout:
// Each transaction block looks like:
//   07 Apr 2025  TRANSFER FROM ...  -  INR 82,588.00  INR 82,725.38
//
// After pdf-parse, these columns may be on the same line or spread over
// a few lines. We group lines by detecting the start of a new date.

// Matches: "07 Apr 2025" style dates
const DATE_DDMONYYYY = /^\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i
// Also matches: "07/04/2025", "07-04-2025"
const DATE_NUMERIC   = /^\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/

function isDateLine(line: string): boolean {
  return DATE_DDMONYYYY.test(line) || DATE_NUMERIC.test(line)
}

// Extract all INR-prefixed or bare decimal amounts from a string
function extractAmounts(text: string): number[] {
  const matches = text.match(/INR\s*[\d,]+\.\d{2}/gi) || text.match(/[\d,]+\.\d{2}/g) || []
  return matches.map(parseAmount).filter(v => v > 0)
}

function parsePdfText(text: string): BankTransaction[] {
  const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const transactions: BankTransaction[] = []

  // Group raw lines into blocks — each block starts with a date
  const blocks: string[][] = []
  let current: string[] = []

  for (const line of rawLines) {
    if (isDateLine(line)) {
      if (current.length > 0) blocks.push(current)
      current = [line]
    } else if (current.length > 0) {
      current.push(line)
    }
  }
  if (current.length > 0) blocks.push(current)

  for (const block of blocks) {
    const fullText = block.join(' ')

    // Extract date from first line
    const dateMatch = block[0].match(/^\d{2}\s+[A-Za-z]{3}\s+\d{4}|\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/)
    if (!dateMatch) continue
    const date = dateMatch[0]

    // Get all amounts in this block
    const amounts = extractAmounts(fullText)
    if (amounts.length === 0) continue

    // Build description: text with date and amounts stripped
    const desc = fullText
      .replace(/\d{2}\s+[A-Za-z]{3}\s+\d{4}/gi, '')
      .replace(/INR\s*[\d,]+\.\d{2}/gi, '')
      .replace(/[\d,]+\.\d{2}/g, '')
      .replace(/\s*-\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 120)

    // Determine debit/credit:
    // Indian Bank format: Debits | Credits | Balance
    // Empty column is shown as "-" — so amounts tell us the count
    //
    // If the block contains both "INR X" in Debits column and "-" for Credits
    // pdf-parse will give us 2 numbers (debit amount + balance).
    // If both are present we get 3 numbers.
    // Use the dash markers to disambiguate.

    let debit = 0, credit = 0, balance = 0

    // Check for explicit "- INR" or "INR ... -" pattern (credit or debit empty)
    const isDebitEmpty  = /^\s*-\s+INR/i.test(block[0].replace(/.*?(?:\d{4})/,'')) ||
                          fullText.match(/\s-\s+INR\s*[\d,]+\.\d{2}\s+INR/i) !== null
    const isCreditEmpty = fullText.match(/INR\s*[\d,]+\.\d{2}\s+-\s+INR/i) !== null ||
                          fullText.match(/INR\s*[\d,]+\.\d{2}\s*-\s*INR/i) !== null

    if (amounts.length >= 3) {
      // Both debit and credit present
      debit = amounts[0]; credit = amounts[1]; balance = amounts[2]
    } else if (amounts.length === 2) {
      balance = amounts[1]
      if (isDebitEmpty) credit = amounts[0]
      else debit = amounts[0]
    } else if (amounts.length === 1) {
      balance = amounts[0]
    }

    // Secondary heuristic: "TRANSFER FROM" / "NEFT" / "UPI ... received" → credit
    if (debit === 0 && credit === 0 && amounts.length > 0) {
      if (/TRANSFER FROM|NEFT.*CREDIT|RTGS.*CREDIT|UPI.*CREDIT|RECEIPT/i.test(fullText)) {
        credit = amounts[0]
      } else {
        debit = amounts[0]
      }
    }

    if (debit === 0 && credit === 0) continue

    transactions.push({ date, description: desc || 'Transaction', debit, credit, balance })
  }

  return transactions
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let pdfText = ''
    let pageCount = 0

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const pdf = await pdfParse(buffer, { max: 0 })
      pdfText = pdf.text
      pageCount = pdf.numpages
    } catch (pdfErr: unknown) {
      const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr)
      if (msg.includes('DOMMatrix') || msg.includes('canvas') || msg.includes('ENOENT')) {
        return NextResponse.json({
          error: 'PDF text extraction failed on this server environment. Please download your bank statement as CSV from net banking and upload that instead.',
          transactions: [],
        })
      }
      throw pdfErr
    }

    const transactions = parsePdfText(pdfText)

    return NextResponse.json({
      transactions,
      pageCount,
      rawPreview: pdfText.slice(0, 300),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'PDF parsing failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
