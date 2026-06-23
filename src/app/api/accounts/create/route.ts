import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantUser } from '@/lib/active-tenant'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { code, name, type, sub_type, parent_id, opening_balance, opening_balance_type } = body

    if (!code || !name || !type) {
      return NextResponse.json({ error: 'code, name, and type are required' }, { status: 400 })
    }

    // Validate code uniqueness within tenant
    const { data: existing } = await supabase
      .from('accounts')
      .select('id')
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('code', code)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: `Account code "${code}" already exists` }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenantUser.tenant_id,
        code,
        name,
        type,
        sub_type: sub_type || null,
        parent_id: parent_id || null,
        opening_balance: opening_balance ?? 0,
        opening_balance_type: opening_balance_type ?? 'Dr',
        is_active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ account: data }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
