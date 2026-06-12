import { NextRequest, NextResponse } from 'next/server'
import { extractPDFText } from '@/lib/parsers/pdf-extractor'
import { parseAuto, parseByKey } from '@/lib/parsers/broker-registry'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const password = (formData.get('password') as string) ?? ''
    const parserKey = (formData.get('parserKey') as string) ?? ''

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract text — try without password first, then with
    let extracted = await extractPDFText(buffer)

    if (extracted.error === 'PASSWORD_REQUIRED' && !password) {
      return NextResponse.json(
        { error: 'PASSWORD_REQUIRED', message: 'This PDF is password-protected. Please enter the password (usually your PAN number).' },
        { status: 422 }
      )
    }

    if ((extracted.error === 'PASSWORD_REQUIRED' || extracted.error === 'WRONG_PASSWORD') && password) {
      extracted = await extractPDFText(buffer, password)
    }

    if (extracted.error === 'WRONG_PASSWORD') {
      return NextResponse.json(
        { error: 'WRONG_PASSWORD', message: 'Incorrect password. For most brokers, the password is your PAN number (e.g. ABCDE1234F).' },
        { status: 422 }
      )
    }

    if (extracted.error || !extracted.text) {
      return NextResponse.json(
        { error: 'PARSE_FAILED', message: extracted.error ?? 'Could not extract text from PDF' },
        { status: 422 }
      )
    }

    // Parse contract note
    const parsed = parserKey
      ? parseByKey(parserKey, extracted.text)
      : parseAuto(extracted.text)

    return NextResponse.json({
      success: true,
      parsed,
      pages: extracted.numPages,
    })
  } catch (err: unknown) {
    console.error('[contract-notes/parse]', err)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'An unexpected error occurred while processing the PDF.' },
      { status: 500 }
    )
  }
}
