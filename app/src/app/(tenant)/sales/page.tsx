import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SalesPageClient from './SalesPageClient'

export default async function SalesPage() {
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

  const [partiesRes, accountsRes, entriesRes] = await Promise.all([
    supabase
      .from('parties')
      .select('id, name')
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
      .eq('voucher_type', 'sales')
      .order('entry_date', { ascending: false })
      .limit(50),
  ])

  return (
    <SalesPageClient
      tenantId={tenantUser.tenant_id}
      customers={partiesRes.data ?? []}
      bankAccounts={accountsRes.data ?? []}
      recentEntries={entriesRes.data ?? []}
    />
  )
}
