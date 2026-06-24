import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantUser } from '@/lib/active-tenant'
import { ModuleKey } from '@/types'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('tenant_modules')
      .select('module_key, is_enabled')
      .eq('tenant_id', tenantUser.tenant_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ modules: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (tenantUser.role !== 'owner' && tenantUser.role !== 'admin') {
      return NextResponse.json({ error: 'Only owners can change modules' }, { status: 403 })
    }

    const { moduleKey, enabled } = await req.json() as { moduleKey: ModuleKey; enabled: boolean }
    if (!moduleKey) return NextResponse.json({ error: 'moduleKey required' }, { status: 400 })

    const { error } = await supabase
      .from('tenant_modules')
      .upsert({
        tenant_id: tenantUser.tenant_id,
        module_key: moduleKey,
        is_enabled: enabled,
        enabled_by: user.id,
      }, { onConflict: 'tenant_id,module_key' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
