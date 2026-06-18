'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { INDUSTRIES, INDUSTRY_GROUPS, getIndustryById } from '@/lib/industries'
import { ALL_MODULE_KEYS, MODULES } from '@/lib/modules'
import { ModuleKey } from '@/types'
import { slugify } from '@/lib/utils'

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
  'Chandigarh','Puducherry','Andaman & Nicobar Islands','Lakshadweep',
  'Dadra & Nagar Haveli and Daman & Diu',
]

export default function NewClientPage() {
  const router = useRouter()

  // Step control
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Company details
  const [form, setForm] = useState({
    name: '',
    industry_id: '',
    gstin: '',
    pan: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    subscription_plan: 'professional' as 'starter' | 'professional' | 'enterprise' | 'onetime',
    financial_year_start: 4,
  })

  // Step 2: Module selection (auto-filled from industry, developer can toggle)
  const [enabledModules, setEnabledModules] = useState<Set<ModuleKey>>(new Set())

  // Step 3: Admin user
  const [adminUser, setAdminUser] = useState({ name: '', email: '', password: '' })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const industryGroups = Object.entries(INDUSTRY_GROUPS)

  function handleIndustryChange(industryId: string) {
    setForm((f) => ({ ...f, industry_id: industryId }))
    const industry = getIndustryById(industryId)
    if (industry) setEnabledModules(new Set(industry.defaultModules))
  }

  function toggleModule(key: ModuleKey) {
    setEnabledModules((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleStep1Next() {
    if (!form.name || !form.industry_id) {
      setError('Company name and industry are required.')
      return
    }
    setError('')
    setStep(2)
  }

  function handleStep2Next() {
    if (enabledModules.size === 0) {
      setError('At least one module must be enabled.')
      return
    }
    setError('')
    setStep(3)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!adminUser.name || !adminUser.email || !adminUser.password) {
      setError('All admin user fields are required.')
      return
    }
    if (adminUser.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant: { ...form, slug: slugify(form.name) },
          modules: Array.from(enabledModules),
          adminUser,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create client')

      router.push('/admin/clients')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Create New Client</h1>
        <p className="text-slate-500 text-sm mt-1">Set up a new business account on ONK Solutions</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['Company Details', 'Module Access', 'Admin User'] as const).map((label, i) => {
          const stepNum = (i + 1) as 1 | 2 | 3
          return (
            <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`flex items-center gap-2 ${step >= stepNum ? 'text-blue-600' : 'text-slate-400'}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2
                  ${step === stepNum ? 'border-blue-600 bg-blue-600 text-white' :
                    step > stepNum ? 'border-blue-600 bg-blue-50 text-blue-600' :
                    'border-slate-300 text-slate-400'}`}>
                  {step > stepNum ? '✓' : stepNum}
                </span>
                <span className="text-sm font-medium hidden sm:block">{label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-px mx-2 ${step > stepNum ? 'bg-blue-300' : 'bg-slate-200'}`} />}
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

        {/* ── STEP 1: Company Details ────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Company Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Company / Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Raj Security Services Pvt Ltd"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Industry <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.industry_id}
                  onChange={(e) => handleIndustryChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Select Industry —</option>
                  {industryGroups.map(([groupKey, groupLabel]) => (
                    <optgroup key={groupKey} label={groupLabel}>
                      {INDUSTRIES.filter((i) => i.group === groupKey).map((industry) => (
                        <option key={industry.id} value={industry.id}>
                          {industry.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {form.industry_id && (
                  <p className="text-xs text-blue-600 mt-1.5">
                    {getIndustryById(form.industry_id)?.defaultModules.length} default modules will be enabled.
                    You can adjust these in the next step.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">GSTIN</label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                  maxLength={15}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">PAN</label>
                <input
                  type="text"
                  value={form.pan}
                  onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))}
                  maxLength={10}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="AAAPL1234C"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="accounts@company.com"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mumbai"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                <select
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Select State —</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                  maxLength={6}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="400001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Financial Year Start</label>
                <select
                  value={form.financial_year_start}
                  onChange={(e) => setForm((f) => ({ ...f, financial_year_start: Number(e.target.value) }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value={4}>April (standard)</option>
                  <option value={1}>January</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Subscription Plan</label>
                <select
                  value={form.subscription_plan}
                  onChange={(e) => setForm((f) => ({ ...f, subscription_plan: e.target.value as typeof form.subscription_plan }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="onetime">One-Time License</option>
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex justify-end">
              <button
                onClick={handleStep1Next}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                Next: Module Access →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Module Access ──────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Module Access</h2>
              <p className="text-sm text-slate-500 mt-1">
                Default modules for <strong>{getIndustryById(form.industry_id)?.label}</strong> are pre-selected.
                Enable or disable additional modules as needed.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_MODULE_KEYS.map((key) => {
                const mod = MODULES[key]
                const isEnabled = enabledModules.has(key)
                const isDefault = getIndustryById(form.industry_id)?.defaultModules.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleModule(key)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      isEnabled
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 mt-0.5 rounded flex-shrink-0 border-2 flex items-center justify-center ${
                      isEnabled ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    }`}>
                      {isEnabled && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isEnabled ? 'text-blue-900' : 'text-slate-700'}`}>
                          {mod.label}
                        </span>
                        {isDefault && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                            default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="text-sm text-slate-500 bg-slate-50 rounded-lg px-4 py-3">
              <strong>{enabledModules.size}</strong> modules enabled.
              Clients cannot change this — only the developer can adjust module access.
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleStep2Next}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                Next: Admin User →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Admin User ────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Admin User</h2>
              <p className="text-sm text-slate-500 mt-1">
                This will be the owner account for <strong>{form.name}</strong>.
                They can create additional users after logging in.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={adminUser.name}
                  onChange={(e) => setAdminUser((u) => ({ ...u, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rajesh Kumar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={adminUser.email}
                  onChange={(e) => setAdminUser((u) => ({ ...u, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="rajesh@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Initial Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={adminUser.password}
                  onChange={(e) => setAdminUser((u) => ({ ...u, password: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min. 8 characters"
                />
                <p className="text-xs text-slate-500 mt-1">Client should change this on first login.</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-medium text-slate-800 mb-2">Summary</p>
              <div className="grid grid-cols-2 gap-1 text-slate-600">
                <span>Company:</span><span className="font-medium text-slate-800">{form.name}</span>
                <span>Industry:</span><span className="font-medium text-slate-800">{getIndustryById(form.industry_id)?.label}</span>
                <span>Plan:</span><span className="font-medium text-slate-800 capitalize">{form.subscription_plan}</span>
                <span>Modules:</span><span className="font-medium text-slate-800">{enabledModules.size} enabled</span>
                <span>GSTIN:</span><span className="font-mono text-slate-800">{form.gstin || '—'}</span>
                <span>State:</span><span className="font-medium text-slate-800">{form.state || '—'}</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-500 disabled:bg-green-300 text-white px-8 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                {loading ? 'Creating client…' : 'Create Client'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
