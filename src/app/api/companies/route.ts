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
    const { name, industryId, gstin, pan, phone, email, address, city, state, pincode, financialYearStart, subscriptionPlan, extraModules } = body as {
      name: string
      industryId: string
      gstin?: string
      pan?: string
      phone?: string
      email?: string
      address?: string
      city?: string
      state?: string
      pincode?: string
      financialYearStart?: number
      subscriptionPlan?: string
      extraModules?: ModuleKey[]
    }

    if (!name || !industryId) {
      return NextResponse.json({ error: 'Company name and industry are required' }, { status: 400 })
    }
    const industry = getIndustryById(industryId)
    if (!industry) return NextResponse.json({ error: 'Invalid industry' }, { status: 400 })

    const baseSlug = slugify(name)
    let slug = baseSlug
    let suffix = 1
    while (true) {
      const { data: existing } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle()
      if (!existing) break
      suffix += 1
      slug = `${baseSlug}-${suffix}`
      if (suffix > 50) return NextResponse.json({ error: 'Could not generate unique slug' }, { status: 500 })
    }

    const modules: ModuleKey[] = Array.from(new Set([...(industry.defaultModules || []), ...(extraModules || [])]))

    const { data: tenantId, error: rpcErr } = await supabase.rpc('create_company_for_user', {
      p_name: name,
      p_slug: slug,
      p_industry_id: industryId,
      p_gstin: gstin || '',
      p_pan: pan || '',
      p_phone: phone || '',
      p_email: email || '',
      p_address: address || '',
      p_city: city || '',
      p_state: state || '',
      p_pincode: pincode || '',
      p_financial_year_start: financialYearStart || 4,
      p_subscription_plan: subscriptionPlan || 'starter',
      p_modules: modules as string[],
    })

    if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 })

    return NextResponse.json({ tenantId, slug }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    console.error('Create company error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
