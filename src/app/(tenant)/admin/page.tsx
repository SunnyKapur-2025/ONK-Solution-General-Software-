'use client'

import { useState, useEffect } from 'react'
import { INDUSTRIES, INDUSTRY_GROUPS, getIndustriesByGroup } from '@/lib/industries'

interface Tenant {
  id: string
  name: string
  slug: string
  industry_id: string
  subscription_plan: string
  is_active: boolean
  created_at: string
  email: string
  phone: string
  state: string
}

// Use the canonical industry list so IDs match the API validation
const INDUSTRIES_BY_GROUP = getIndustriesByGroup()
void INDUSTRIES // suppress unused warning

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-600',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
  onetime: 'bg-green-100 text-green-700',
}

export default function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const [form, setForm] = useState({
    name: '', slug: '', industry_id: 'consulting',
    gstin: '', pan: '', phone: '', email: '',
    address: '', city: '', state: '', pincode: '',
    financial_year_start: 4,
    subscription_plan: 'starter',
    adminName: '', adminEmail: '', adminPassword: '',
  })

  useEffect(() => { loadTenants() }, [])

  async function loadTenants() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/clients')
      const data = await res.json()
      setTenants(data.tenants || [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    setCreateSuccess('')
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: {
            name: form.name,
            slug: form.slug || autoSlug(form.name),
            industry_id: form.industry_id,
            gstin: form.gstin || undefined,
            pan: form.pan || undefined,
            phone: form.phone || undefined,
            email: form.email || undefined,
            address: form.address || undefined,
            city: form.city || undefined,
            state: form.state || undefined,
            pincode: form.pincode || undefined,
            financial_year_start: form.financial_year_start,
            subscription_plan: form.subscription_plan,
          },
          modules: ['sales', 'purchases', 'expenses', 'bank', 'debtors', 'creditors', 'pnl', 'dashboard', 'reports', 'gst', 'tds'],
          adminUser: { name: form.adminName, email: form.adminEmail, password: form.adminPassword },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      setCreateSuccess(`Client "${form.name}" created successfully. Login: ${form.adminEmail}`)
      setShowCreate(false)
      setForm(f => ({ ...f, name: '', slug: '', gstin: '', pan: '', phone: '', email: '', address: '', city: '', state: '', pincode: '', adminName: '', adminEmail: '', adminPassword: '' }))
      loadTenants()
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create client')
    } finally {
      setCreating(false)
    }
  }

  const inp = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const lbl = 'block text-sm font-medium text-slate-700 mb-1'

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Client Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create and manage sub-tenants (client companies)</p>
        </div>
        <button onClick={() => setShowCreate(v => !v)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm">
          {showCreate ? '✕ Cancel' : '+ New Client'}
        </button>
      </div>

      {createSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">{createSuccess}</div>
      )}

      {showCreate && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Create New Client Account</h2>
          <form onSubmit={handleCreate} className="space-y-6">

            {/* Company Info */}
            <div>
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Company Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={lbl}>Company Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))} className={inp} placeholder="ABC Pvt Ltd" />
                </div>
                <div>
                  <label className={lbl}>Industry</label>
                  <select value={form.industry_id} onChange={e => setForm(f => ({ ...f, industry_id: e.target.value }))} className={inp + ' bg-white'}>
                    {Object.entries(INDUSTRIES_BY_GROUP).map(([group, industries]) => (
                      <optgroup key={group} label={INDUSTRY_GROUPS[group] || group}>
                        {industries.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Subscription Plan</label>
                  <select value={form.subscription_plan} onChange={e => setForm(f => ({ ...f, subscription_plan: e.target.value }))} className={inp + ' bg-white'}>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="onetime">One-Time</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>GSTIN</label>
                  <input value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} className={inp} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div>
                  <label className={lbl}>PAN</label>
                  <input value={form.pan} onChange={e => setForm(f => ({ ...f, pan: e.target.value }))} className={inp} placeholder="AAAAA0000A" />
                </div>
                <div>
                  <label className={lbl}>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inp} placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className={lbl}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} placeholder="accounts@company.com" />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inp} placeholder="Street address" />
                </div>
                <div>
                  <label className={lbl}>City</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className={lbl}>State</label>
                  <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Financial Year Start</label>
                  <select value={form.financial_year_start} onChange={e => setForm(f => ({ ...f, financial_year_start: parseInt(e.target.value) }))} className={inp + ' bg-white'}>
                    <option value={4}>April (Indian FY)</option>
                    <option value={1}>January (Calendar Year)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Admin User */}
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Owner / Admin Login</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={lbl}>Full Name *</label>
                  <input required value={form.adminName} onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))} className={inp} placeholder="Owner Name" />
                </div>
                <div>
                  <label className={lbl}>Email *</label>
                  <input required type="email" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} className={inp} placeholder="owner@company.com" />
                </div>
                <div>
                  <label className={lbl}>Temporary Password *</label>
                  <input required type="password" minLength={8} value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} className={inp} placeholder="Min. 8 characters" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">The owner can change their password after first login.</p>
            </div>

            {createError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{createError}</p>}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-medium text-sm">
                {creating ? 'Creating…' : 'Create Client'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Clients table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">All Clients ({tenants.length})</h3>
          <button onClick={loadTenants} className="text-xs text-slate-500 hover:text-slate-700">Refresh</button>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-400">Loading…</div>
        ) : tenants.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <p className="text-3xl mb-3">🏢</p>
            <p className="font-medium">No clients yet</p>
            <p className="text-sm mt-1">Click &quot;New Client&quot; to onboard your first client.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">State</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.state || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PLAN_COLORS[t.subscription_plan] || 'bg-slate-100 text-slate-600'}`}>
                      {t.subscription_plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
