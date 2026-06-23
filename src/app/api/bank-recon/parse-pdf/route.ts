export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export interface BankTransaction {
  date: string
  description: string
  debit: number
  credit: number
  balance: number
}

function parseAmount(s: string): number {
  if (!s) return 0
  return parseFloat(s.replace(/INR\s*/gi, '').replace(/[,\s]/g, '').trim()) || 0
}

const MON_MAP: Record<string, string> = {
  jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
  jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12',
}

function normalizeDate(raw: string): string {
  raw = raw.trim()
  const m1 = raw.match(/(\d{1,2})[\/\-\s]+([A-Za-z]{3})[\/\-\s]+(\d{4})/)
  if (m1) return `${m1[3]}-${MON_MAP[m1[2].toLowerCase()] ?? '01'}-${m1[1].padStart(2,'0')}`
  const m2 = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (m2) {
    const yr = m2[3].length === 2 ? '20' + m2[3] : m2[3]
    return `${yr}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`
  }
  return raw
}

function detectBank(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('hdfc bank')) return 'hdfc'
  if (t.includes('icici bank')) return 'icici'
  if (t.includes('state bank of india') || t.includes('sbi')) return 'sbi'
  if (t.includes('axis bank')) return 'axis'
  if (t.includes('kotak mahindra')) return 'kotak'
  if (t.includes('punjab national bank') || t.includes('pnb')) return 'pnb'
  if (t.includes('bank of baroda') || t.includes('bob')) return 'bob'
  if (t.includes('canara bank')) return 'canara'
  if (t.includes('indian bank') || t.includes('idib')) return 'indian_bank'
  return 'generic'
}

// Matches date ANYWHERE in a line (not just at start)
const DATE_DDMONYYYY_ANY = /\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i
const DATE_NUMERIC_ANY   = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/
const AMOUNT_RE          = /(?:INR\s*|Rs\.?\s*)?[\d,]+\.\d{2}/gi

function findDateInLine(line: string): string | null {
  const m1 = line.match(DATE_DDMONYYYY_ANY)
  if (m1) return m1[0]
  const m2 = line.match(DATE_NUMERIC_ANY)
  if (m2) return m2[0]
  return null
}

function isDateLine(line: string): boolean {
  return findDateInLine(line) !== null
}

function extractAmounts(text: string): number[] {
  const matches = text.match(AMOUNT_RE) || []
  return matches.map(parseAmount).filter(v => v > 0)
}

// ── Parser 1: block-based (lines grouped by date) ────────────────────────────
function parseGeneric(text: string): BankTransaction[] {
  const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const transactions: BankTransaction[] = []

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
    const dateRaw = findDateInLine(block[0])
    if (!dateRaw) continue
    const date = normalizeDate(dateRaw)

    const amounts = extractAmounts(fullText)
    if (amounts.length === 0) continue

    const desc = fullText
      .replace(DATE_DDMONYYYY_ANY, '')
      .replace(DATE_NUMERIC_ANY, '')
      .replace(/(?:INR\s*|Rs\.?\s*)[\d,]+\.\d{2}/gi, '')
      .replace(/[\d,]+\.\d{2}/g, '')
      .replace(/\s*-\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 120)

    // Check for empty-column dash markers
    const isDebitEmpty  = fullText.match(/\s-\s+(?:INR\s*)?[\d,]+\.\d{2}\s+(?:INR\s*)?[\d,]/i) !== null
    const isCreditEmpty = fullText.match(/(?:INR\s*)?[\d,]+\.\d{2}\s+-\s+(?:INR\s*)?[\d,]/i) !== null

    let debit = 0, credit = 0, balance = 0

    if (amounts.length >= 3) {
      debit = amounts[0]; credit = amounts[1]; balance = amounts[2]
    } else if (amounts.length === 2) {
      balance = amounts[1]
      if (isDebitEmpty) credit = amounts[0]
      else debit = amounts[0]
    } else if (amounts.length === 1) {
      balance = amounts[0]
    }

    // Keyword heuristic
    if (debit === 0 && credit === 0 && amounts.length > 0) {
      if (/TRANSFER FROM|NEFT.*(?:CR|CREDIT)|RTGS.*(?:CR|CREDIT)|UPI.*(?:CR|CREDIT|RCV|RECEIVED)|RECEIPT|REFUND|INT PAID|BY TRANSFER|CR INTEREST|SALARY CR/i.test(fullText)) {
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

// ── Parser 2: single-line tabular (HDFC, SBI, Axis etc.) ────────────────────
function parseTabular(text: string): BankTransaction[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const transactions: BankTransaction[] = []

  for (const line of lines) {
    const dateRaw = findDateInLine(line)
    if (!dateRaw) continue
    const amounts = extractAmounts(line)
    if (amounts.length < 2) continue

    const date = normalizeDate(dateRaw)
    const balance = amounts[amounts.length - 1]

    const isCreditLine = /\bCR\b|CREDIT|RECEIVED|REFUND|DEPOSIT|NEFT CR|IMPS CR|UPI CR|SALARY CR/i.test(line)

    let debit = 0, credit = 0
    if (amounts.length >= 3) {
      debit = amounts[0]; credit = amounts[1]
    } else if (amounts.length === 2) {
      if (isCreditLine) credit = amounts[0]
      else debit = amounts[0]
    }

    const desc = line
      .replace(DATE_DDMONYYYY_ANY, '')
      .replace(DATE_NUMERIC_ANY, '')
      .replace(/(?:INR\s*|Rs\.?\s*)[\d,]+\.\d{2}/gi, '')
      .replace(/[\d,]+\.\d{2}/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 120)

    if (debit === 0 && credit === 0) continue
    transactions.push({ date, description: desc || 'Transaction', debit, credit, balance })
  }

  return transactions
}

// ── Parser 3: merged-lines approach (join all lines, split on date boundaries) ─
// Handles PDFs where pdf-parse merges page columns or reorders content
function parseMergedLines(text: string): BankTransaction[] {
  // Replace newlines with spaces, then split on date pattern boundaries
  const merged = text.replace(/\n+/g, ' ').replace(/\s{3,}/g, '  ')

  // Find all date positions
  const datePattern = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi
  const matches: Array<{ index: number; date: string }> = []
  let m
  while ((m = datePattern.exec(merged)) !== null) {
    matches.push({ index: m.index, date: m[1] })
  }

  if (matches.length === 0) return []

  const transactions: BankTransaction[] = []

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index
    const end = matches[i + 1]?.index ?? merged.length
    const segment = merged.slice(start, end)

    const amounts = extractAmounts(segment)
    if (amounts.length === 0) continue

    const date = normalizeDate(matches[i].date)

    const desc = segment
      .replace(DATE_DDMONYYYY_ANY, '')
      .replace(DATE_NUMERIC_ANY, '')
      .replace(/(?:INR\s*|Rs\.?\s*)[\d,]+\.\d{2}/gi, '')
      .replace(/[\d,]+\.\d{2}/g, '')
      .replace(/\s*-\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 120)

    const isDebitEmpty = segment.match(/\s-\s+(?:INR\s*)?[\d,]+\.\d{2}/i) !== null
    let debit = 0, credit = 0, balance = 0

    if (amounts.length >= 3) {
      debit = amounts[0]; credit = amounts[1]; balance = amounts[2]
    } else if (amounts.length === 2) {
      balance = amounts[1]
      if (isDebitEmpty) credit = amounts[0]
      else debit = amounts[0]
    } else {
      balance = amounts[0]
    }

    if (debit === 0 && credit === 0 && amounts.length > 0) {
      if (/TRANSFER FROM|NEFT.*(?:CR|CREDIT)|RTGS.*(?:CR|CREDIT)|UPI.*(?:CR|RECEIVED)|RECEIPT|REFUND|INT PAID|CR INTEREST|SALARY CR/i.test(segment)) {
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

function parsePdfText(text: string): BankTransaction[] {
  // Try all three parsers, pick the one that finds the most transactions
  const results = [
    parseGeneric(text),
    parseTabular(text),
    parseMergedLines(text),
  ]
  results.sort((a, b) => b.length - a.length)
  return results[0]
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
          error: 'PDF text extraction failed on this server. Please download your bank statement as CSV from net banking instead.',
          transactions: [],
          rawPreview: '',
        })
      }
      throw pdfErr
    }

    const transactions = parsePdfText(pdfText)
    const bank = detectBank(pdfText)

    return NextResponse.json({
      transactions,
      pageCount,
      bank,
      // Return first 800 chars of extracted text so the UI can show it for debugging
      rawPreview: pdfText.slice(0, 800),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'PDF parsing failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
