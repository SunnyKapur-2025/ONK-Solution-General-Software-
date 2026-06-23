'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Company {
  id: string
  name: string
  slug: string
  industry_id: string
  gstin: string | null
  role: string
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    fetch('/api/companies')
      .then((r) => r.json())
      .then((d) => { setCompanies(d.companies || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function pick(id: string) {
    setSwitching(id)
    await fetch('/api/companies/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: id }),
    })
    window.location.href = '/dashboard'
  }

  async function signOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My companies</h1>
          <div className="flex items-center gap-2">
            <Link href="/companies/new" className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg font-medium">
              + Add company
            </Link>
            <button
              onClick={signOut}
              disabled={signingOut}
              className="text-sm border border-slate-300 hover:border-red-400 hover:text-red-600 text-slate-500 px-3.5 py-2 rounded-lg font-medium transition-colors"
            >
              {signingOut ? 'Signing out…' : '⏻ Sign out'}
            </button>
          </div>
        </div>

        {loading && <p className="text-slate-500 text-sm">Loading…</p>}

        {!loading && companies.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-600 mb-4">No companies found. Create one to get started.</p>
            <Link href="/companies/new" className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm">
              Create your first company
            </Link>
          </div>
        )}

        <div className="space-y-2">
          {companies.map((c) => (
            <button key={c.id} onClick={() => pick(c.id)} disabled={switching !== null}
              className="w-full text-left bg-white border border-slate-200 hover:border-blue-400 rounded-xl px-4 py-3 flex items-center justify-between transition">
              <div>
                <p className="font-semibold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.gstin || 'No GSTIN'} · <span className="capitalize">{c.role}</span></p>
              </div>
              <span className="text-blue-600 text-sm">{switching === c.id ? 'Opening…' : 'Open →'}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
