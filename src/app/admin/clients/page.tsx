import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { getIndustryById } from '@/lib/industries'

export default async function ClientsPage() {
  const supabase = await createAdminClient()
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, industry_id, subscription_plan, is_active, state, created_at, email')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm mt-1">{tenants?.length ?? 0} active accounts</p>
        </div>
        <Link
          href="/admin/clients/new"
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          + New Client
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3.5 font-medium text-slate-600">Company</th>
              <th className="text-left px-4 py-3.5 font-medium text-slate-600">Industry</th>
              <th className="text-left px-4 py-3.5 font-medium text-slate-600">State</th>
              <th className="text-left px-4 py-3.5 font-medium text-slate-600">Plan</th>
              <th className="text-left px-4 py-3.5 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3.5 font-medium text-slate-600">Created</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants?.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-900">{t.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{t.email}</p>
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {getIndustryById(t.industry_id)?.label ?? t.industry_id}
                </td>
                <td className="px-4 py-4 text-slate-600">{t.state ?? '—'}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize
                    ${t.subscription_plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                      t.subscription_plan === 'professional' ? 'bg-blue-100 text-blue-700' :
                      t.subscription_plan === 'onetime' ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-600'}`}>
                    {t.subscription_plan}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium
                    ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-500">
                  {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/admin/clients/${t.id}`}
                    className="text-blue-600 hover:underline text-xs font-medium"
                  >
                    Manage →
                  </Link>
                </td>
              </tr>
            ))}
            {(!tenants || tenants.length === 0) && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                  No clients yet.{' '}
                  <Link href="/admin/clients/new" className="text-blue-600 hover:underline">
                    Create your first client →
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
