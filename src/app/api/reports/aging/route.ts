import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface OutstandingRow {
  partyId: string
  partyName: string
  amount: number
  daysOld: number
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') === 'creditors' ? 'vendor' : 'customer'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!tenantUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase.rpc('get_party_outstanding', {
      p_tenant_id: tenantUser.tenant_id,
      p_party_type: type,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Group by party and bucket by age
    const partyMap = new Map<string, {
      partyId: string; partyName: string
      current: number; days31_60: number; days61_90: number; days91_180: number; above180: number
    }>()

    for (const row of (data || []) as OutstandingRow[]) {
      if (!partyMap.has(row.partyId)) {
        partyMap.set(row.partyId, {
          partyId: row.partyId, partyName: row.partyName,
          current: 0, days31_60: 0, days61_90: 0, days91_180: 0, above180: 0,
        })
      }
      const entry = partyMap.get(row.partyId)!
      const days = row.daysOld
      const amount = Number(row.amount)

      if (days <= 30)       entry.current    += amount
      else if (days <= 60)  entry.days31_60  += amount
      else if (days <= 90)  entry.days61_90  += amount
      else if (days <= 180) entry.days91_180 += amount
      else                  entry.above180   += amount
    }

    const rows = Array.from(partyMap.values()).map((p) => ({
      ...p,
      total: p.current + p.days31_60 + p.days61_90 + p.days91_180 + p.above180,
    })).filter((p) => p.total > 0.01)
      .sort((a, b) => b.total - a.total)

    return NextResponse.json({ rows })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
