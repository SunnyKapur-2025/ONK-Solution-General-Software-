import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getIndustryById } from '@/lib/industries'
import { slugify } from '@/lib/utils'
import { ModuleKey } from '@/types'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('tenant_users')
      .select('tenant_id, role, is_active, tenants(id, name, slug, industry_id, gstin, is_active)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const companies = (data || []).map((row) => {
      const t = (Array.isArray(row.tenants) ? row.tenants[0] : row.tenants) as
        | { id: string; name: string; slug: string; industry_id: string; gstin: string | null; is_active: boolean }
        | null
      return t ? { id: t.id, name: t.name, slug: t.slug, industry_id: t.industry_id, gstin: t.gstin, role: row.role } : null
    }).filter(Boolean)

    return NextResponse.json({ companies })
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

    const body = await req.json()
    const {
      name, industryId, gstin, pan, phone, email,
      address, city, state, pincode,
      financialYearStart, subscriptionPlan, extraModules,
    } = body as {
      name: string
      industryId: string
      gstin?: string; pan?: string; phone?: string; email?: string
      address?: string; city?: string; state?: string; pincode?: string
      financialYearStart?: number
      subscriptionPlan?: string
      extraModules?: ModuleKey[]
    }

    if (!name || !industryId) {
      return NextResponse.json({ error: 'Company name and industry are required' }, { status: 400 })
    }
    const industry = getIndustryById(industryId)
    if (!industry) return NextResponse.json({ error: 'Invalid industry' }, { status: 400 })

    // Generate unique slug — append random suffix to avoid conflicts from
    // prior partial creations that the user can't see due to RLS
    const baseSlug = slugify(name)
    const rand = Math.random().toString(36).slice(2, 6)
    let slug = baseSlug
    for (let i = 1; i <= 10; i++) {
      const { data: existing } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (!existing) break
      slug = `${baseSlug}-${rand}-${i}`
      if (i === 10) slug = `${baseSlug}-${Date.now()}`
    }

    const modules: ModuleKey[] = Array.from(
      new Set([...(industry.defaultModules || []), ...(extraModules || [])])
    )

    // Use SECURITY DEFINER RPC — no admin client / service role key needed
    const { data: tenantId, error: rpcErr } = await supabase.rpc('create_company_for_user', {
      p_name: name,
      p_slug: slug,
      p_industry_id: industryId,
      p_gstin: gstin || null,
      p_pan: pan || null,
      p_phone: phone || null,
      p_email: email || null,
      p_address: address || null,
      p_city: city || null,
      p_state: state || null,
      p_pincode: pincode || null,
      p_financial_year_start: financialYearStart || 4,
      p_subscription_plan: subscriptionPlan || 'starter',
      p_modules: modules,
    })

    if (rpcErr) {
      console.error('create_company_for_user RPC error:', rpcErr.message)
      return NextResponse.json({ error: rpcErr.message }, { status: 500 })
    }

    return NextResponse.json({ tenantId, slug }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    console.error('Create company error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
