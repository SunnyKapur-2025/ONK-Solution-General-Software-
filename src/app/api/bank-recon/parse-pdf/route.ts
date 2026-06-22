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

// ── Date normalizers ──────────────────────────────────────────────────────────
const MON_MAP: Record<string, string> = {
  jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
  jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12',
}

function normalizeDate(raw: string): string {
  raw = raw.trim()
  // DD Mon YYYY  →  YYYY-MM-DD
  const m1 = raw.match(/^(\d{1,2})[\/\-\s]+([A-Za-z]{3})[\/\-\s]+(\d{4})/)
  if (m1) return `${m1[3]}-${MON_MAP[m1[2].toLowerCase()] ?? '01'}-${m1[1].padStart(2,'0')}`
  // DD/MM/YYYY or DD-MM-YYYY
  const m2 = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (m2) {
    const yr = m2[3].length === 2 ? '20' + m2[3] : m2[3]
    return `${yr}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`
  }
  return raw
}

// ── Bank format detection ─────────────────────────────────────────────────────
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

// ── Generic block-based parser (works for most Indian banks) ─────────────────
const DATE_DDMONYYYY = /^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i
const DATE_NUMERIC   = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/
const AMOUNT_RE      = /(?:INR\s*|Rs\.?\s*)?[\d,]+\.\d{2}/gi

function isDateLine(line: string): boolean {
  return DATE_DDMONYYYY.test(line) || DATE_NUMERIC.test(line)
}

function extractAmounts(text: string): number[] {
  const matches = text.match(AMOUNT_RE) || []
  return matches.map(parseAmount).filter(v => v > 0)
}

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

    const dateMatch = block[0].match(/\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)
    if (!dateMatch) continue
    const date = normalizeDate(dateMatch[0])

    const amounts = extractAmounts(fullText)
    if (amounts.length === 0) continue

    const desc = fullText
      .replace(/\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/gi, '')
      .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, '')
      .replace(/(?:INR\s*|Rs\.?\s*)[\d,]+\.\d{2}/gi, '')
      .replace(/[\d,]+\.\d{2}/g, '')
      .replace(/\s*-\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 120)

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

    // Keyword-based heuristic
    if (debit === 0 && credit === 0 && amounts.length > 0) {
      if (/TRANSFER FROM|NEFT.*(?:CR|CREDIT)|RTGS.*(?:CR|CREDIT)|UPI.*(?:CR|CREDIT|RCV|RECEIVED)|RECEIPT|REFUND|INT PAID|BY TRANSFER|CR INTEREST/i.test(fullText)) {
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

// ── Table-style parser for HDFC / Axis / Kotak / SBI PDF text ────────────────
// These banks produce cleaner columnar text. Each row is a single line like:
//   03/06/2025  NEFT CR-123456-...-Client  50000.00  -  1234567.00
// Columns: Date | Description | Debit | Credit | Balance
function parseTabular(text: string): BankTransaction[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const transactions: BankTransaction[] = []

  for (const line of lines) {
    if (!isDateLine(line)) continue
    const amounts = extractAmounts(line)
    if (amounts.length < 2) continue

    const dateMatch = line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/)
    if (!dateMatch) continue

    const date = normalizeDate(dateMatch[0])
    const balance = amounts[amounts.length - 1]

    const isCreditLine = /\bCR\b|CREDIT|RECEIVED|REFUND|DEPOSIT|SALARY CREDIT|NEFT CR|IMPS CR|UPI CR/i.test(line)

    let debit = 0, credit = 0

    if (amounts.length >= 3) {
      debit = amounts[0]; credit = amounts[1]
    } else if (amounts.length === 2) {
      if (isCreditLine) credit = amounts[0]
      else debit = amounts[0]
    }

    const desc = line
      .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, '')
      .replace(/\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/gi, '')
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

function parsePdfText(text: string): BankTransaction[] {
  const bank = detectBank(text)

  let results: BankTransaction[] = []

  // Try block parser first (works for Indian Bank, PNB, BoB, Canara)
  results = parseGeneric(text)

  // If block parser found very few items, try tabular (HDFC, ICICI, SBI, Axis, Kotak)
  if (results.length < 2) {
    const tabular = parseTabular(text)
    if (tabular.length > results.length) results = tabular
  }

  void bank // used implicitly via text detection
  return results
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
      rawPreview: pdfText.slice(0, 300),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'PDF parsing failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
