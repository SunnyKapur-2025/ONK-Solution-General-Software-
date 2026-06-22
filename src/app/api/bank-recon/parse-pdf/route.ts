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

const DATE_RE = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{2,4}|\d{2}-[A-Za-z]{3}-\d{2,4})\b/

function extractTransactions(text: string): BankTransaction[] {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  const transactions: BankTransaction[] = []

  for (const line of lines) {
    if (!DATE_RE.test(line)) continue

    const nums = [...line.matchAll(/[\d,]+\.\d{2}/g)].map(m =>
      parseFloat(m[0].replace(/,/g, ''))
    )
    if (nums.length < 1) continue

    const dateMatch = line.match(DATE_RE)
    const date = dateMatch ? dateMatch[0] : ''

    const desc = line
      .replace(DATE_RE, '')
      .replace(/[\d,]+\.\d{2}/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    const isDr = /\bDr\b/i.test(line) || /debit|withdrawal/i.test(line)

    let debit = 0, credit = 0, balance = 0

    if (nums.length >= 3) {
      debit = nums[0]; credit = nums[1]; balance = nums[2]
    } else if (nums.length === 2) {
      balance = nums[1]
      if (isDr) debit = nums[0]; else credit = nums[0]
    } else {
      balance = nums[0]
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
      // Pass options to prevent pdf-parse from accessing filesystem during init
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const pdf = await pdfParse(buffer, { max: 0 })
      pdfText = pdf.text
      pageCount = pdf.numpages
    } catch (pdfErr: unknown) {
      const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr)
      // If it's the canvas/DOMMatrix issue from pdfjs, return a clear message
      if (msg.includes('DOMMatrix') || msg.includes('canvas') || msg.includes('ENOENT')) {
        return NextResponse.json({
          error: 'This PDF could not be processed automatically. Please download your bank statement as CSV from net banking and upload that instead.',
          transactions: [],
        })
      }
      throw pdfErr
    }

    const transactions = extractTransactions(pdfText)

    return NextResponse.json({ transactions, pageCount })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'PDF parsing failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
