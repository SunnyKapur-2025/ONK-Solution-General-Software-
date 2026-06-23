'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { INDUSTRIES } from '@/lib/industries'

const GROUP_LABELS: Record<string, string> = {
  service: 'Service Industry',
  trading: 'Trading',
  professional: 'Professional Services',
  manufacturing: 'Manufacturing',
  finance: 'Finance & NBFC',
}

export default function NewCompanyPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [industryId, setIndustryId] = useState('')
  const [gstin, setGstin] = useState('')
  const [pan, setPan] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, industryId, gstin, pan, phone, email, city, state,
        financialYearStart: 4,
        subscriptionPlan: 'starter',
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'Failed to create company')
      setLoading(false)
      return
    }
    // Set the just-created company as active and go to dashboard.
    await fetch('/api/companies/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: json.tenantId }),
    })
    router.push('/dashboard')
    router.refresh()
  }

  const grouped = INDUSTRIES.reduce<Record<string, typeof INDUSTRIES>>((acc, ind) => {
    (acc[ind.group] ||= []).push(ind)
    return acc
  }, {})

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Create your company</h1>
          <Link href="/companies" className="text-sm text-blue-600 hover:underline">My companies</Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Company name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Acme Services Pvt Ltd"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Industry *</label>
            <select
              required
              value={industryId}
              onChange={(e) => setIndustryId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an industry</option>
              {Object.entries(grouped).map(([group, items]) => (
                <optgroup key={group} label={GROUP_LABELS[group] || group}>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Modules will be auto-enabled based on the industry you pick.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">GSTIN</label>
              <input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} maxLength={15}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="22AAAAA0000A1Z5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">PAN</label>
              <input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} maxLength={10}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="AAAAA0000A" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Company email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
              <input value={state} onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white py-2.5 rounded-lg font-medium text-sm">
            {loading ? 'Creating company…' : 'Create company'}
          </button>
        </form>
      </div>
    </main>
  )
}
