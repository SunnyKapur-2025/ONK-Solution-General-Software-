import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEBTORS_PARENT_CODE  = '1630'
const CREDITORS_PARENT_CODE = '2100'

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  return data?.tenant_id as string | undefined
}

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

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const tenantId = await getTenantId(supabase, user.id)
    if (!tenantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('parties')
      .select('id, name, alias, type, gstin, email, phone, state, registration_type, account_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ parties: data || [] })
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
    const tenantId = await getTenantId(supabase, user.id)
    if (!tenantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const {
      name, alias, type,
      gstin, pan, phone, email,
      address, city, state, pincode, country,
      creditDays, creditLimit,
      registrationType,
      maintainBillByBill, defaultCreditPeriod, checkCreditDays,
      bankAccountNo, bankIfsc, bankName,
      mailingName,
    } = body as {
      name: string
      alias?: string
      type: 'customer' | 'vendor' | 'both'
      gstin?: string; pan?: string; phone?: string; email?: string
      address?: string; city?: string; state?: string; pincode?: string; country?: string
      creditDays?: number; creditLimit?: number
      registrationType?: string
      maintainBillByBill?: boolean
      defaultCreditPeriod?: number
      checkCreditDays?: boolean
      bankAccountNo?: string; bankIfsc?: string; bankName?: string
      mailingName?: string
    }

    if (!name || !type) return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    if (!['customer', 'vendor', 'both'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const parentCode = type === 'vendor' ? CREDITORS_PARENT_CODE : DEBTORS_PARENT_CODE
    const accountType = type === 'vendor' ? 'liability' : 'asset'
    const subType     = type === 'vendor' ? 'trade_payable' : 'trade_receivable'

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
        alias: alias || null,
        gst_registration_type: registrationType || 'unregistered',
        maintain_bill_by_bill: maintainBillByBill ?? true,
        default_credit_period: defaultCreditPeriod ?? 30,
        check_credit_days: checkCreditDays ?? false,
        bank_account_no: bankAccountNo || null,
        bank_ifsc: bankIfsc || null,
        bank_name: bankName || null,
        country: country || 'India',
        is_system: false,
        is_active: true,
        opening_balance: 0,
        opening_balance_type: 'dr',
      })
      .select()
      .single()
    if (accErr) return NextResponse.json({ error: `Ledger creation failed: ${accErr.message}` }, { status: 500 })

    const { data: party, error: pErr } = await supabase
      .from('parties')
      .insert({
        tenant_id: tenantId,
        name, alias: alias || null, mailing_name: mailingName || name,
        type,
        gstin: gstin || null, pan: pan || null,
        phone: phone || null, email: email || null,
        address: address || null, city: city || null,
        state: state || null, pincode: pincode || null,
        country: country || 'India',
        credit_days: creditDays ?? 30,
        credit_limit: creditLimit ?? 0,
        registration_type: registrationType || 'Regular',
        maintain_bill_by_bill: maintainBillByBill ?? true,
        default_credit_period: defaultCreditPeriod ?? 30,
        check_credit_days: checkCreditDays ?? false,
        bank_account_no: bankAccountNo || null,
        bank_ifsc: bankIfsc || null,
        bank_name: bankName || null,
        account_id: account.id,
      })
      .select()
      .single()

    if (pErr) {
      await supabase.from('accounts').delete().eq('id', account.id)
      return NextResponse.json({ error: pErr.message }, { status: 500 })
    }

    return NextResponse.json({ party, account }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    console.error('Parties POST error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
