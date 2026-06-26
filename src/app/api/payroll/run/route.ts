import { NextRequest, NextResponse } from 'next/server'

interface PayrollRunRow {
  employeeId: string
  employeeName: string
  gross: number
  netPay: number
  pfEmployee: number
  pfEmployer: number
  esiEmployee: number
  esiEmployer: number
  tds: number
}

interface PayrollRunRequest {
  month: number   // 0-indexed
  year: number
  rows: PayrollRunRow[]
}

// In-memory journal entries (demo). In production persist to Supabase journal_entries table.
const journalEntries: Record<string, unknown>[] = []

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export async function POST(req: NextRequest) {
  try {
    const body: PayrollRunRequest = await req.json()
    const { month, year, rows } = body

    if (typeof month !== 'number' || typeof year !== 'number' || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'month (number), year (number), and rows (array) are required' }, { status: 400 })
    }

    const monthLabel = `${MONTH_NAMES[month]} ${year}`
    const totalGross = rows.reduce((s, r) => s + r.gross, 0)
    const totalNetPay = rows.reduce((s, r) => s + r.netPay, 0)
    const totalPfEmployee = rows.reduce((s, r) => s + r.pfEmployee, 0)
    const totalPfEmployer = rows.reduce((s, r) => s + r.pfEmployer, 0)
    const totalEsiEmployee = rows.reduce((s, r) => s + r.esiEmployee, 0)
    const totalEsiEmployer = rows.reduce((s, r) => s + r.esiEmployer, 0)
    const totalTds = rows.reduce((s, r) => s + r.tds, 0)

    // Create journal entries for payroll
    // Dr Salary Expense (gross) / Cr Bank/Cash (net pay) + Cr PF Payable + Cr ESI Payable + Cr TDS Payable
    const entry = {
      id: crypto.randomUUID(),
      date: new Date(`${year}-${String(month + 1).padStart(2, '0')}-01`).toISOString().split('T')[0],
      narration: `Payroll for ${monthLabel} — ${rows.length} employee(s)`,
      lines: [
        { account: 'Salary Expense', type: 'debit', amount: totalGross },
        ...(totalPfEmployer > 0 ? [{ account: 'PF Expense (Employer)', type: 'debit', amount: totalPfEmployer }] : []),
        ...(totalEsiEmployer > 0 ? [{ account: 'ESI Expense (Employer)', type: 'debit', amount: totalEsiEmployer }] : []),
        { account: 'Salaries Payable / Bank', type: 'credit', amount: totalNetPay },
        ...(totalPfEmployee + totalPfEmployer > 0 ? [{ account: 'PF Payable', type: 'credit', amount: totalPfEmployee + totalPfEmployer }] : []),
        ...(totalEsiEmployee + totalEsiEmployer > 0 ? [{ account: 'ESI Payable', type: 'credit', amount: totalEsiEmployee + totalEsiEmployer }] : []),
        ...(totalTds > 0 ? [{ account: 'TDS Payable', type: 'credit', amount: totalTds }] : []),
      ],
      createdAt: new Date().toISOString(),
    }

    journalEntries.push(entry)

    return NextResponse.json({
      success: true,
      journalEntryId: entry.id,
      summary: {
        month: monthLabel,
        employees: rows.length,
        totalGross,
        totalNetPay,
        totalPfEmployee,
        totalPfEmployer,
        totalEsiEmployee,
        totalEsiEmployer,
        totalTds,
      },
    })
  } catch (err) {
    console.error('[payroll/run POST]', err)
    return NextResponse.json({ error: 'Failed to run payroll' }, { status: 500 })
  }
}
