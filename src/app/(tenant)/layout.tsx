import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ModuleKey } from '@/types'
import AppShell from '@/components/layout/AppShell'

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('role, name, tenant_id, tenants(name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!tenantUser) redirect('/auth/login')

  const { data: modulesData } = await supabase
    .from('tenant_modules')
    .select('module_key')
    .eq('tenant_id', tenantUser.tenant_id)
    .eq('is_enabled', true)

  const enabledModules = (modulesData ?? []).map((m) => m.module_key as ModuleKey)
  const tenant = (Array.isArray(tenantUser.tenants) ? tenantUser.tenants[0] : tenantUser.tenants) as { name: string } | null

  return (
    <AppShell
      tenantName={tenant?.name || ''}
      userName={tenantUser.name}
      userRole={tenantUser.role}
      enabledModules={enabledModules}
    >
      {children}
    </AppShell>
  )
}
