import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantUser } from '@/lib/active-tenant'

// Map sub_type → Tally parent group
const TALLY_GROUP_MAP: Record<string, string> = {
  bank:                 'Bank Accounts',
  cash:                 'Cash-in-Hand',
  receivable:           'Sundry Debtors',
  payable:              'Sundry Creditors',
  fixed_asset:          'Fixed Assets',
  capital:              'Capital Account',
  reserves:             'Reserves & Surplus',
  long_term_loan:       'Secured Loans',
  short_term_borrowing: 'Bank OD Accounts',
  direct_income:        'Sales Accounts',
  sales:                'Sales Accounts',
  direct_expense:       'Purchase Accounts',
  purchases:            'Purchase Accounts',
  other_income:         'Indirect Income',
  indirect_expense:     'Indirect Expenses',
  inventory:            'Stock-in-Hand',
}

function toTallyGroup(type: string, subType: string): string {
  if (TALLY_GROUP_MAP[subType]) return TALLY_GROUP_MAP[subType]
  if (TALLY_GROUP_MAP[type])    return TALLY_GROUP_MAP[type]
  return 'Sundry Debtors' // safe fallback
}

function formatBalance(amount: number, balanceType: string): string {
  const abs = Math.abs(amount).toFixed(2)
  const sign = balanceType?.toLowerCase() === 'cr' ? 'Cr' : 'Dr'
  return `${abs} ${sign}`
}

function buildTallyXML(accounts: AccountRow[], companyName: string): string {
  const ledgers = accounts.map(a => {
    const parent = toTallyGroup(a.type ?? '', a.sub_type ?? '')
    const obStr  = formatBalance(a.opening_balance ?? 0, a.opening_balance_type ?? 'Dr')
    return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${escapeXml(a.name)}" ACTION="Create">
            <NAME>${escapeXml(a.name)}</NAME>
            <PARENT>${escapeXml(parent)}</PARENT>
            <OPENINGBALANCE>${obStr}</OPENINGBALANCE>
          </LEDGER>
        </TALLYMESSAGE>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES><SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY></STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${ledgers}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildBusyCSV(accounts: AccountRow[]): string {
  const header = 'Ledger Name,Group,Opening Balance,Dr/Cr'
  const rows = accounts.map(a => {
    const group  = toTallyGroup(a.type ?? '', a.sub_type ?? '')
    const amount = (a.opening_balance ?? 0).toFixed(2)
    const drcr   = (a.opening_balance_type ?? 'Dr').toUpperCase()
    return [
      csvField(a.name),
      csvField(group),
      amount,
      drcr,
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

function csvField(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

interface AccountRow {
  id: string
  name: string
  code: string | null
  type: string | null
  sub_type: string | null
  opening_balance: number | null
  opening_balance_type: string | null
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantUser = await getActiveTenantUser(supabase, user.id)
    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const format = (searchParams.get('format') ?? 'tally') as 'tally' | 'busy'
    const idsParam = searchParams.get('ids')
    const ids = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : null

    let query = supabase
      .from('accounts')
      .select('id, name, code, type, sub_type, opening_balance, opening_balance_type')
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('is_active', true)
      .order('name')

    if (ids && ids.length > 0) {
      query = query.in('id', ids)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const accounts = (data ?? []) as AccountRow[]

    // Resolve company name
    const { data: tenantRecord } = await supabase.from('tenants').select('name').eq('id', tenantUser.tenant_id).maybeSingle()
    const companyName = tenantRecord?.name ?? 'My Company'

    if (format === 'tally') {
      const xml = buildTallyXML(accounts, companyName)
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=UTF-8',
          'Content-Disposition': 'attachment; filename="ONK_Ledgers_Tally.xml"',
        },
      })
    } else {
      const csv = buildBusyCSV(accounts)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=UTF-8',
          'Content-Disposition': 'attachment; filename="ONK_Ledgers_Busy.csv"',
        },
      })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
