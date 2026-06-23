import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantUser } from '@/lib/active-tenant'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { matches } = body as {
      matches: Array<{
        journalEntryId: string
        bankDate: string
        bankDescription: string
        bankAmount: number
      }>
    }

    if (!Array.isArray(matches) || matches.length === 0) {
      return NextResponse.json({ error: 'No matches provided' }, { status: 400 })
    }

    const tenantId = tenantUser.tenant_id
    let reconciledCount = 0

    for (const match of matches) {
      const { error } = await supabase
        .from('journal_entries')
        .update({
          status: 'reconciled',
          reference: `Bank: ${match.bankDescription} (${match.bankDate})`,
        })
        .eq('id', match.journalEntryId)
        .eq('tenant_id', tenantId)
        .eq('status', 'posted')

      if (!error) reconciledCount++
    }

    return NextResponse.json({
      success: true,
      reconciledCount,
      message: `${reconciledCount} of ${matches.length} entries reconciled.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[bank-recon/reconcile]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
