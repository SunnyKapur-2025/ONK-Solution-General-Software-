import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaymentsPageClient from './PaymentsPageClient'

export default async function PaymentsPage() {
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

  const [creditorsRes, accountsRes, entriesRes] = await Promise.all([
    supabase
      .from('parties')
      .select('id, name')
      .eq('tenant_id', tenantUser.tenant_id)
      .in('type', ['vendor', 'both'])
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
      .eq('voucher_type', 'payment')
      .order('entry_date', { ascending: false })
      .limit(50),
  ])

  return (
    <PaymentsPageClient
      tenantId={tenantUser.tenant_id}
      creditors={creditorsRes.data ?? []}
      bankAccounts={accountsRes.data ?? []}
      recentEntries={entriesRes.data ?? []}
    />
  )
}
