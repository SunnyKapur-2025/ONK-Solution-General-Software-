import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantUser } from '@/lib/active-tenant'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tenantData } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantUser.tenant_id)
      .maybeSingle()

    return NextResponse.json({
      userName: tenantUser.name,
      userRole: tenantUser.role,
      tenantName: tenantData?.name || '',
      tenantId: tenantUser.tenant_id,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
