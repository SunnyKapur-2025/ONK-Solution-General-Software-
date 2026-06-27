'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editGstin, setEditGstin] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleteInProgress, setDeleteInProgress] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadCompanies = useCallback(() => {
    setLoading(true)
    fetch('/api/companies')
      .then((r) => r.json())
      .then((d) => { setCompanies(d.companies || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { loadCompanies() }, [loadCompanies])

  async function pick(id: string) {
    setSwitching(id)
    const res = await fetch('/api/companies/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: id }),
    })
    if (!res.ok) {
      setSwitching(null)
      alert((await res.json()).error || 'Could not open company')
      return
    }
    // Hard navigation so the tenant layout re-reads the cookie
    window.location.assign('/dashboard')
  }

  async function signOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  function openEdit(c: Company) {
    setEditingId(c.id)
    setEditName(c.name)
    setEditGstin(c.gstin || '')
    setEditError('')
  }

  async function handleEditSave() {
    if (!editingId) return
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/companies/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, gstin: editGstin }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setEditingId(null)
      loadCompanies()
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Failed to save changes')
    } finally {
      setEditSaving(false)
    }
  }

  function openDelete(c: Company) {
    setDeletingId(c.id)
    setDeleteConfirmName('')
    setDeleteError('')
  }

  async function handleDeleteConfirm() {
    if (!deletingId) return
    const company = companies.find((c) => c.id === deletingId)
    if (!company) return
    if (deleteConfirmName !== company.name) {
      setDeleteError('Company name does not match. Please type the exact name.')
      return
    }
    setDeleteInProgress(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/companies/${deletingId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      setDeletingId(null)
      loadCompanies()
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete company')
    } finally {
      setDeleteInProgress(false)
    }
  }

  const deletingCompany = deletingId ? companies.find((c) => c.id === deletingId) : null

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

        {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">{error}</p>}

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
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between transition hover:border-slate-300">
              <button
                onClick={() => pick(c.id)}
                disabled={switching !== null}
                className="flex-1 text-left"
              >
                <p className="font-semibold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.gstin || 'No GSTIN'} · <span className="capitalize">{c.role}</span></p>
              </button>
              <div className="flex items-center gap-1 ml-4">
                <button
                  onClick={() => pick(c.id)}
                  disabled={switching !== null}
                  className="text-blue-600 text-sm px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                >
                  {switching === c.id ? 'Opening…' : 'Open →'}
                </button>
                {c.role === 'owner' && (
                  <>
                    <button
                      onClick={() => openEdit(c)}
                      className="text-xs text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDelete(c)}
                      className="text-xs text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Edit modal */}
        {editingId && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Edit Company</h2>
              {editError && <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">{editError}</p>}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Company Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">GSTIN</label>
                <input
                  value={editGstin}
                  onChange={(e) => setEditGstin(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleEditSave}
                  disabled={editSaving || !editName.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium"
                >
                  {editSaving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation modal */}
        {deletingId && deletingCompany && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
              <h2 className="text-lg font-semibold text-red-700">Delete Company</h2>
              <p className="text-sm text-slate-600">
                This will permanently delete <strong>{deletingCompany.name}</strong> and all its data. This action cannot be undone.
              </p>
              <p className="text-sm text-slate-700">
                Type <strong>{deletingCompany.name}</strong> to confirm:
              </p>
              {deleteError && <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">{deleteError}</p>}
              <input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={deletingCompany.name}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteInProgress || deleteConfirmName !== deletingCompany.name}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium"
                >
                  {deleteInProgress ? 'Deleting…' : 'Delete permanently'}
                </button>
                <button
                  onClick={() => setDeletingId(null)}
                  className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
