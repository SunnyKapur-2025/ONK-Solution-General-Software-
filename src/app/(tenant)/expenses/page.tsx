import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveTenantUser } from '@/lib/active-tenant'
import ExpensesPageClient from './ExpensesPageClient'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const tenantUser = await getActiveTenantUser(supabase, user.id)
  if (!tenantUser) redirect('/auth/login')

  const [accountsRes, entriesRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, code')
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('type', 'asset')
      .eq('sub_type', 'bank'),

    supabase
      .from('journal_entries')
      .select('id, entry_number, entry_date, narration, status')
      .eq('tenant_id', tenantUser.tenant_id)
      .eq('voucher_type', 'journal')
      .order('entry_date', { ascending: false })
      .limit(50),
  ])

  return (
    <ExpensesPageClient
      tenantId={tenantUser.tenant_id}
      bankAccounts={accountsRes.data ?? []}
      recentEntries={entriesRes.data ?? []}
    />
  )
}
