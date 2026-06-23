import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTallyXml, TallyVoucher } from '@/lib/export/tally'
import { generateBusyCsv, BusyVoucher } from '@/lib/export/busy'
import { getActiveTenantUser } from '@/lib/active-tenant'

const VOUCHER_TYPE_MAP: Record<string, string> = {
  sales:       'Sales',
  purchase:    'Purchase',
  receipt:     'Receipt',
  payment:     'Payment',
  journal:     'Journal',
  contra:      'Contra',
  credit_note: 'Credit Note',
  debit_note:  'Debit Note',
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const format = searchParams.get('format') || 'tally'

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to dates are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tenantData } = await supabase.from('tenants').select('name').eq('id', tenantUser.tenant_id).maybeSingle()
    const companyName = tenantData?.name || 'ONK Client'

    // Fetch journal entries with lines and accounts
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select(`
        id, entry_number, entry_date, narration, voucher_type, reference,
        journal_lines(
          debit, credit, narration,
          accounts(name, code),
          parties(name)
        )
      `)
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('status', 'posted')
      .gte('entry_date', from)
      .lte('entry_date', to)
      .order('entry_date')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (format === 'tally') {
      const vouchers: TallyVoucher[] = (entries || []).map((e) => ({
        date: e.entry_date,
        voucherType: VOUCHER_TYPE_MAP[e.voucher_type] || 'Journal',
        voucherNumber: e.entry_number,
        narration: e.narration,
        reference: e.reference || undefined,
        lines: (e.journal_lines as unknown as Array<{
          debit: number; credit: number; narration?: string;
          accounts: { name: string } | null;
          parties: { name: string } | null;
        }>).map((l) => ({
          ledgerName: l.accounts?.name || 'Unknown',
          amount: l.debit > 0 ? l.debit : -l.credit,
          isDeemedPositive: l.debit > 0,
        })),
      }))

      const xml = generateTallyXml(companyName, vouchers)
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="tally_export_${from}_${to}.xml"`,
        },
      })
    }

    // Busy CSV
    const busyVouchers: BusyVoucher[] = []
    for (const e of entries || []) {
      const lines = e.journal_lines as unknown as Array<{
        debit: number; credit: number; narration?: string;
        accounts: { name: string } | null;
        parties: { name: string } | null;
      }>
      for (const line of lines) {
        busyVouchers.push({
          date: e.entry_date,
          voucherType: VOUCHER_TYPE_MAP[e.voucher_type] || 'Journal',
          voucherNumber: e.entry_number,
          narration: e.narration,
          partyName: line.parties?.name,
          ledgerName: line.accounts?.name || 'Unknown',
          debit: line.debit,
          credit: line.credit,
          reference: e.reference || undefined,
        })
      }
    }

    const csv = generateBusyCsv(busyVouchers)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="busy_export_${from}_${to}.csv"`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
