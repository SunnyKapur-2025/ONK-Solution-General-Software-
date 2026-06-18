import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MODULES } from '@/lib/modules'
import { ModuleKey } from '@/types'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get tenant and enabled modules for this user
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('role, name, tenant_id, tenants(name, industry_id, subscription_plan)')
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
  const tenant = (Array.isArray(tenantUser.tenants) ? tenantUser.tenants[0] : tenantUser.tenants) as { name: string; industry_id: string; subscription_plan: string } | null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-slate-900">
              <span className="text-blue-600">ONK</span> Solutions
            </span>
            {tenant && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700 font-medium">{tenant.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                  ${tenant.subscription_plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                    tenant.subscription_plan === 'professional' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'}`}>
                  {tenant.subscription_plan}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{tenantUser.name}</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full capitalize">
              {tenantUser.role}
            </span>
            <form action="/auth/signout" method="post">
              <button className="text-sm text-slate-500 hover:text-slate-700">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">Welcome, {tenantUser.name.split(' ')[0]}</h2>
          <p className="text-slate-500 text-sm mt-1">Your enabled modules are shown below.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {enabledModules.map((key) => {
            const mod = MODULES[key]
            return (
              <Link
                key={key}
                href={`/${key.replace('_', '-')}`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <p className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                  {mod.label}
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mod.description}</p>
              </Link>
            )
          })}
        </div>

        {enabledModules.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">No modules enabled yet</p>
            <p className="text-sm mt-1">Contact ONK Solutions to enable your account modules.</p>
          </div>
        )}
      </main>
    </div>
  )
}
