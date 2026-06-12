import { NextRequest, NextResponse } from 'next/server'
import { syncToTally, checkTallyConnection } from '@/lib/tally/tally-sync'

export async function GET() {
  const status = await checkTallyConnection()
  return NextResponse.json(status)
}

export async function POST(req: NextRequest) {
  try {
    const { xml } = await req.json() as { xml: string }
    if (!xml) return NextResponse.json({ error: 'xml is required' }, { status: 400 })

    const result = await syncToTally(xml)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
