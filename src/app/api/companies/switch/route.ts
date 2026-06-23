import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const ACTIVE_TENANT_COOKIE = 'onk_active_tenant'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { tenantId } = (await req.json()) as { tenantId?: string }
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    // Verify membership
    const { data: tu } = await supabase
      .from('tenant_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle()
    if (!tu) return NextResponse.json({ error: 'Not a member of that company' }, { status: 403 })

    const res = NextResponse.json({ ok: true, tenantId })
    res.cookies.set(ACTIVE_TENANT_COOKIE, tenantId, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
