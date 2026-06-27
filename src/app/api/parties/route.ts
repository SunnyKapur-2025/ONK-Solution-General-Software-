import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantUser } from '@/lib/active-tenant'

const DEBTORS_PARENT_CODE = '1630'   // Sundry Debtors
const CREDITORS_PARENT_CODE = '2100' // Sundry Creditors

async function nextLedgerCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  parentCode: string
): Promise<{ code: string; parentId: string | null }> {
  const { data: parent } = await supabase
    .from('accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('code', parentCode)
    .maybeSingle()

  const { data: existing } = await supabase
    .from('accounts')
    .select('code')
    .eq('tenant_id', tenantId)
    .like('code', `${parentCode}.%`)

  let maxN = 0
  for (const a of existing || []) {
    const m = a.code.match(new RegExp(`^${parentCode}\\.([0-9]+)$`))
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10))
  }
  const next = String(maxN + 1).padStart(4, '0')
  return { code: `${parentCode}.${next}`, parentId: parent?.id || null }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { tenant_id: tenantId } = tenantUser

    const typeParam = req.nextUrl.searchParams.get('type') ?? 'all'

    let query = supabase
      .from('parties')
      .select('id, name, type, gstin, pan, phone, email, city, state, credit_days, credit_limit, is_active, account_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name')

    if (typeParam === 'customer') {
      query = query.in('type', ['customer', 'both'])
    } else if (typeParam === 'vendor') {
      query = query.in('type', ['vendor', 'both'])
    } else if (typeParam === 'both') {
      query = query.eq('type', 'both')
    }
    // 'all' — no extra filter

    const { data: parties, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!parties || parties.length === 0) {
      return NextResponse.json({ parties: [] })
    }

    // Fetch outstanding balances from journal_lines for each party's account
    const accountIds = parties.map((p) => p.account_id).filter(Boolean) as string[]

    let balanceMap: Record<string, number> = {}
    if (accountIds.length > 0) {
      const { data: lines, error: lErr } = await supabase
        .from('journal_lines')
        .select('account_id, debit, credit')
        .in('account_id', accountIds)
      if (lErr) {
        console.error('journal_lines fetch error:', lErr.message)
      } else {
        for (const line of lines || []) {
          const prev = balanceMap[line.account_id] ?? 0
          balanceMap[line.account_id] = prev + (line.debit ?? 0) - (line.credit ?? 0)
        }
      }
    }

    const result = parties.map(({ account_id, ...p }) => ({
      ...p,
      outstanding: balanceMap[account_id ?? ''] ?? 0,
    }))

    return NextResponse.json({ parties: result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    console.error('Parties GET error:', msg)
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
    const { tenant_id: tenantId } = tenantUser

    const body = await req.json()
    const {
      name, type, gstin, pan, phone, email,
      address, city, state, pincode,
      credit_days, credit_limit,
    } = body as {
      name: string
      type: 'customer' | 'vendor' | 'both'
      gstin?: string; pan?: string; phone?: string; email?: string
      address?: string; city?: string; state?: string; pincode?: string
      credit_days?: number; credit_limit?: number
    }

    if (!name || !type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 })
    }
    if (!['customer', 'vendor', 'both'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be customer, vendor, or both' }, { status: 400 })
    }

    const parentCode = type === 'vendor' ? CREDITORS_PARENT_CODE : DEBTORS_PARENT_CODE
    const accountType = parentCode === CREDITORS_PARENT_CODE ? 'liability' : 'asset'
    const subType = parentCode === CREDITORS_PARENT_CODE ? 'trade_payable' : 'trade_receivable'

    const { code, parentId } = await nextLedgerCode(supabase, tenantId, parentCode)

    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .insert({
        tenant_id: tenantId,
        code,
        name,
        type: accountType,
        sub_type: subType,
        parent_id: parentId,
        is_system: false,
        is_active: true,
        opening_balance: 0,
        opening_balance_type: 'dr',
      })
      .select()
      .maybeSingle()
    if (accErr || !account) {
      console.error('Ledger creation failed:', accErr?.message)
      return NextResponse.json({ error: `Ledger creation failed: ${accErr?.message ?? 'no data returned'}` }, { status: 500 })
    }

    const { data: party, error: pErr } = await supabase
      .from('parties')
      .insert({
        tenant_id: tenantId,
        name, type,
        gstin: gstin || null, pan: pan || null,
        phone: phone || null, email: email || null,
        address: address || null, city: city || null,
        state: state || null, pincode: pincode || null,
        credit_days: credit_days ?? 30,
        credit_limit: credit_limit ?? 0,
        account_id: account.id,
      })
      .select()
      .maybeSingle()
    if (pErr || !party) {
      const errMsg = pErr?.message || 'Party insert failed'
      console.error('Party insert failed:', errMsg)
      await supabase.from('accounts').delete().eq('id', account.id)
      return NextResponse.json({ error: errMsg }, { status: 500 })
    }

    return NextResponse.json({ party, account }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    console.error('Parties POST error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { tenant_id: tenantId } = tenantUser

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required as a query param' }, { status: 400 })

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase
      .from('parties')
      .select('id, account_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Party not found' }, { status: 404 })

    const body = await req.json()
    const {
      name, type, gstin, pan, phone, email,
      address, city, state, pincode,
      credit_days, credit_limit,
    } = body as {
      name: string
      type: 'customer' | 'vendor' | 'both'
      gstin?: string; pan?: string; phone?: string; email?: string
      address?: string; city?: string; state?: string; pincode?: string
      credit_days?: number; credit_limit?: number
    }

    if (!name || !type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 })
    }
    if (!['customer', 'vendor', 'both'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be customer, vendor, or both' }, { status: 400 })
    }

    const { data: party, error: pErr } = await supabase
      .from('parties')
      .update({
        name, type,
        gstin: gstin || null, pan: pan || null,
        phone: phone || null, email: email || null,
        address: address || null, city: city || null,
        state: state || null, pincode: pincode || null,
        credit_days: credit_days ?? 30,
        credit_limit: credit_limit ?? 0,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .maybeSingle()
    if (pErr) {
      console.error('Party update failed:', pErr.message)
      return NextResponse.json({ error: pErr.message }, { status: 500 })
    }

    // Keep account name in sync
    if (existing.account_id) {
      const { error: accErr } = await supabase
        .from('accounts')
        .update({ name })
        .eq('id', existing.account_id)
        .eq('tenant_id', tenantId)
      if (accErr) console.error('Account name sync failed:', accErr.message)
    }

    return NextResponse.json({ party })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    console.error('Parties PUT error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { tenant_id: tenantId } = tenantUser

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required as a query param' }, { status: 400 })

    // Verify ownership before soft-delete
    const { data: existing, error: fetchErr } = await supabase
      .from('parties')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Party not found' }, { status: 404 })

    const { error: delErr } = await supabase
      .from('parties')
      .update({ is_active: false })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    if (delErr) {
      console.error('Party soft-delete failed:', delErr.message)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    console.error('Parties DELETE error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
