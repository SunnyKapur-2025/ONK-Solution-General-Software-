import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('name, role, tenant_id, tenants(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenant = (Array.isArray(tenantUser.tenants) ? tenantUser.tenants[0] : tenantUser.tenants) as { name: string } | null

    return NextResponse.json({
      userName: tenantUser.name,
      userRole: tenantUser.role,
      tenantName: tenant?.name || '',
      tenantId: tenantUser.tenant_id,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
