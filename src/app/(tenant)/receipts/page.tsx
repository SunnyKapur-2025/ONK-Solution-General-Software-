import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReceiptsPageClient from './ReceiptsPageClient'

export default async function ReceiptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!tenantUser) redirect('/auth/login')

  const [debtorsRes, accountsRes, entriesRes] = await Promise.all([
    supabase
      .from('parties')
      .select('id, name, outstanding_amount')
      .eq('tenant_id', tenantUser.tenant_id)
      .in('type', ['customer', 'both'])
      .eq('is_active', true)
      .order('name'),

    supabase
      .from('accounts')
      .select('id, name, code')
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('type', 'asset')
      .eq('sub_type', 'bank'),

    supabase
      .from('journal_entries')
      .select('id, entry_number, entry_date, narration, status, created_at')
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('voucher_type', 'receipt')
      .order('entry_date', { ascending: false })
      .limit(50),
  ])

  const debtors = (debtorsRes.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    outstanding: d.outstanding_amount ?? 0,
  }))

  return (
    <ReceiptsPageClient
      tenantId={tenantUser.tenant_id}
      debtors={debtors}
      bankAccounts={accountsRes.data ?? []}
      recentEntries={entriesRes.data ?? []}
    />
  )
}
