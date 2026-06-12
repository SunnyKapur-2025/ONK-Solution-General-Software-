import { NextRequest, NextResponse } from 'next/server'
import { generateJournalEntries } from '@/lib/accounting/stock-journal'
import { generateTallyXML, generateLedgerMastersXML } from '@/lib/tally/stock-xml'
import type { ParsedContractNote } from '@/lib/parsers/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      contractNote: ParsedContractNote
      fifoAverageCost?: Record<string, number>
      companyName?: string
    }

    if (!body.contractNote) {
      return NextResponse.json({ error: 'contractNote is required' }, { status: 400 })
    }

    const entries = generateJournalEntries(body.contractNote, body.fifoAverageCost)
    const companyName = body.companyName ?? 'My Company'
    const vouchersXML = generateTallyXML(entries, companyName)
    const mastersXML = generateLedgerMastersXML(entries, companyName)

    const hasErrors = entries.some(e => e.validationErrors.length > 0)
    const allErrors = entries.flatMap(e => e.validationErrors)

    return NextResponse.json({
      success: true,
      entries,
      tally: { vouchersXML, mastersXML },
      hasErrors,
      errors: allErrors,
    })
  } catch (err: unknown) {
    console.error('[generate-journal]', err)
    return NextResponse.json({ error: 'Failed to generate journal entries' }, { status: 500 })
  }
}
