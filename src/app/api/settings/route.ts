import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantUser } from '@/lib/active-tenant'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('tenants')
      .select('name, gstin, pan, phone, email, address, city, state, pincode, financial_year_start, logo_url')
      .eq('id', tenantUser.tenant_id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ settings: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (tenantUser.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: only owner can update settings' }, { status: 403 })
    }

    const body = await req.json()
    const { name, gstin, pan, phone, email, address, city, state, pincode, financial_year_start } = body

    const { data, error } = await supabase
      .from('tenants')
      .update({ name, gstin, pan, phone, email, address, city, state, pincode, financial_year_start })
      .eq('id', tenantUser.tenant_id)
      .select('name, gstin, pan, phone, email, address, city, state, pincode, financial_year_start, logo_url')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ settings: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
