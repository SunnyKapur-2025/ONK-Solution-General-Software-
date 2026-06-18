import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from') || new Date().toISOString().split('T')[0]
    const to   = searchParams.get('to')   || from
    const type = searchParams.get('type')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let query = supabase
      .from('journal_entries')
      .select(`
        id, entry_number, entry_date, narration, voucher_type, status, created_by,
        journal_lines(debit, credit, parties(name))
      `)
      .eq('tenant_id', tenantUser.tenant_id)
      .gte('entry_date', from)
      .lte('entry_date', to)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (type) query = query.eq('voucher_type', type)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const entries = (data || []).map((e) => {
      const lines = e.journal_lines as unknown as Array<{
        debit: number; credit: number;
        parties: { name: string } | null
      }> || []
      const totalDebit  = lines.reduce((s: number, l) => s + (l.debit  || 0), 0)
      const totalCredit = lines.reduce((s: number, l) => s + (l.credit || 0), 0)
      const party = lines.find(l => l.parties?.name)?.parties?.name

      return {
        id: e.id,
        entryNumber: e.entry_number,
        date: e.entry_date,
        voucherType: e.voucher_type,
        narration: e.narration,
        partyName: party,
        totalDebit,
        totalCredit,
        status: e.status,
        createdBy: e.created_by,
      }
    })

    return NextResponse.json({ entries })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
