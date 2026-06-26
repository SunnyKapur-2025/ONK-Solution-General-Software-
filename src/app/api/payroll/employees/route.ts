import { NextRequest, NextResponse } from 'next/server'

// In-memory store (demo). In production replace with Supabase parties table query.
const employees: Record<string, unknown>[] = []

export async function GET() {
  return NextResponse.json({ employees })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const employee = { ...body, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    employees.push(employee)
    return NextResponse.json({ employee }, { status: 201 })
  } catch (err) {
    console.error('[payroll/employees POST]', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...rest } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const idx = employees.findIndex(e => (e as { id: string }).id === id)
    if (idx === -1) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    employees[idx] = { ...employees[idx], ...rest }
    return NextResponse.json({ employee: employees[idx] })
  } catch (err) {
    console.error('[payroll/employees PUT]', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const idx = employees.findIndex(e => (e as { id: string }).id === id)
    if (idx === -1) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    employees.splice(idx, 1)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[payroll/employees DELETE]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
