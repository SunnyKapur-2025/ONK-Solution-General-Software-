import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('tenant_users')
      .select('id, name, email, role, is_active, created_at')
      .eq('tenant_id', tenantUser.tenant_id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data || [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['owner', 'superadmin'].includes(tenantUser.role)) {
      return NextResponse.json({ error: 'Forbidden: only owner or superadmin can invite users' }, { status: 403 })
    }

    const body = await req.json()
    const { email, name, role, password } = body

    if (!email || !name || !role || !password) {
      return NextResponse.json({ error: 'email, name, role, and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const adminClient = await createAdminClient()

    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

    const { data: newUser, error: insertError } = await supabase
      .from('tenant_users')
      .insert({
        tenant_id: tenantUser.tenant_id,
        user_id: authData.user.id,
        email,
        name,
        role,
        is_active: true,
      })
      .select('id, name, email, role, is_active, created_at')
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['owner', 'superadmin'].includes(tenantUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, role, is_active } = body

    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (role !== undefined) updates.role = role
    if (is_active !== undefined) updates.is_active = is_active

    const { data, error } = await supabase
      .from('tenant_users')
      .update(updates)
      .eq('id', userId)
      .eq('tenant_id', tenantUser.tenant_id)
      .select('id, name, email, role, is_active, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ user: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
