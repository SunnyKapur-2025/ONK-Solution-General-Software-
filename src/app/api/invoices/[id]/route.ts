import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantUser } from '@/lib/active-tenant'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('journal_entries')
      .select('id, entry_number, entry_date, narration, status, reference, voucher_type')
      .eq('id', id)
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('voucher_type', 'sales')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Verify ownership
    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id, tenant_id')
      .eq('id', id)
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('voucher_type', 'sales')
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json() as {
      narration?: string
      reference?: string
      entry_date?: string
      entry_number?: string
      status?: string
    }

    const { error } = await supabase
      .from('journal_entries')
      .update({
        ...(body.narration !== undefined && { narration: body.narration }),
        ...(body.reference !== undefined && { reference: body.reference }),
        ...(body.entry_date !== undefined && { entry_date: body.entry_date }),
        ...(body.entry_number !== undefined && { entry_number: body.entry_number }),
        ...(body.status !== undefined && { status: body.status }),
      })
      .eq('id', id)
      .eq('tenant_id', tenantUser.tenant_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Verify ownership
    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('voucher_type', 'sales')
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Delete lines first (FK constraint)
    await supabase.from('journal_lines').delete().eq('journal_entry_id', id)
    const { error } = await supabase.from('journal_entries').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
