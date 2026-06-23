import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ModuleKey } from '@/types'
import AppShell from '@/components/layout/AppShell'

const ACTIVE_TENANT_COOKIE = 'onk_active_tenant'

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // List all memberships for this user
  const { data: memberships } = await supabase
    .from('tenant_users')
    .select('id, role, name, tenant_id, tenants(id, name)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (!memberships || memberships.length === 0) redirect('/companies/new')

  // Pick active tenant from cookie if present and the user is a member of it;
  // otherwise fall back to first membership.
  const cookieStore = await cookies()
  const wantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value
  const active =
    memberships.find((m) => m.tenant_id === wantId) ?? memberships[0]

  const tenant = (Array.isArray(active.tenants) ? active.tenants[0] : active.tenants) as
    | { id: string; name: string }
    | null

  const { data: modulesData } = await supabase
    .from('tenant_modules')
    .select('module_key')
    .eq('tenant_id', active.tenant_id)
    .eq('is_enabled', true)

  const enabledModules = (modulesData ?? []).map((m) => m.module_key as ModuleKey)

  const companies = memberships
    .map((m) => {
      const t = (Array.isArray(m.tenants) ? m.tenants[0] : m.tenants) as { id: string; name: string } | null
      return t ? { id: t.id, name: t.name } : null
    })
    .filter((x): x is { id: string; name: string } => x !== null)

  return (
    <AppShell
      tenantName={tenant?.name || ''}
      tenantId={active.tenant_id}
      userName={active.name}
      userRole={active.role}
      enabledModules={enabledModules}
      companies={companies}
    >
      {children}
    </AppShell>
  )
}
