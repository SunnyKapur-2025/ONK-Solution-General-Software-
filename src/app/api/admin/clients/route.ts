import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getIndustryById } from '@/lib/industries'
import { ModuleKey } from '@/types'

async function requireSuperadmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .eq('role', 'superadmin')
    .single()
  return data ? user : null
}

export async function POST(req: NextRequest) {
  try {
    const caller = await requireSuperadmin()
    if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { tenant, modules, adminUser } = body as {
      tenant: {
        name: string
        slug: string
        industry_id: string
        gstin?: string
        pan?: string
        phone?: string
        email?: string
        address?: string
        city?: string
        state?: string
        pincode?: string
        financial_year_start: number
        subscription_plan: string
      }
      modules: ModuleKey[]
      adminUser: { name: string; email: string; password: string }
    }

    // Validate required fields
    if (!tenant.name || !tenant.industry_id || !adminUser.email || !adminUser.password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!getIndustryById(tenant.industry_id)) {
      return NextResponse.json({ error: 'Invalid industry' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
      user_metadata: { name: adminUser.name },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Create tenant record
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: tenant.name,
        slug: tenant.slug,
        industry_id: tenant.industry_id,
        gstin: tenant.gstin || null,
        pan: tenant.pan || null,
        phone: tenant.phone || null,
        email: tenant.email || null,
        address: tenant.address || null,
        city: tenant.city || null,
        state: tenant.state || null,
        pincode: tenant.pincode || null,
        financial_year_start: tenant.financial_year_start,
        subscription_plan: tenant.subscription_plan,
        created_by: userId,
      })
      .select()
      .single()

    if (tenantError) {
      // Roll back auth user
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: tenantError.message }, { status: 500 })
    }

    const tenantId = tenantData.id

    // 3. Create tenant_user record (owner role)
    const { error: tuError } = await supabase.from('tenant_users').insert({
      tenant_id: tenantId,
      user_id: userId,
      role: 'owner',
      name: adminUser.name,
      email: adminUser.email,
    })

    if (tuError) {
      await supabase.auth.admin.deleteUser(userId)
      await supabase.from('tenants').delete().eq('id', tenantId)
      return NextResponse.json({ error: tuError.message }, { status: 500 })
    }

    // 4. Insert module permissions
    const moduleRows = modules.map((key) => ({
      tenant_id: tenantId,
      module_key: key,
      is_enabled: true,
    }))

    const { error: modError } = await supabase.from('tenant_modules').insert(moduleRows)

    if (modError) {
      return NextResponse.json({ error: modError.message }, { status: 500 })
    }

    // 5. Seed chart of accounts
    const { error: coaError } = await supabase.rpc('seed_chart_of_accounts', {
      p_tenant_id: tenantId,
    })

    if (coaError) {
      // Non-fatal — log and continue
      console.error('CoA seed error:', coaError.message)
    }

    return NextResponse.json({ tenantId, message: 'Client created successfully' }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('Create client error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const caller = await requireSuperadmin()
    if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, slug, industry_id, subscription_plan, is_active, created_at, email, phone, state')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ tenants: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
