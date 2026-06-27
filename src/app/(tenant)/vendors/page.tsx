'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vendor {
  id: string
  name: string
  type: 'vendor' | 'both'
  gstin: string | null
  pan: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  credit_days: number
  credit_limit: number
  account_id: string | null
}

interface AgingRow {
  partyId: string
  total: number
}

interface VendorFormData {
  name: string
  type: 'vendor' | 'both'
  gstin: string
  pan: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
  creditDays: number
  creditLimit: string
}

const EMPTY_FORM: VendorFormData = {
  name: '',
  type: 'vendor',
  gstin: '',
  pan: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  creditDays: 30,
  creditLimit: '',
}

// ─── Field helpers ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Panel state
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null)
  const [form, setForm] = useState<VendorFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [panelError, setPanelError] = useState('')

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    try {
      const [partiesRes, agingRes] = await Promise.all([
        fetch('/api/parties?type=vendor'),
        fetch('/api/reports/aging?type=creditors'),
      ])
      const partiesData = await partiesRes.json()
      const agingData = await agingRes.json()

      const allParties: Vendor[] = (partiesData.parties || []).filter(
        (p: Vendor) => p.type === 'vendor' || p.type === 'both'
      )
      setVendors(allParties)

      const balanceMap: Record<string, number> = {}
      for (const row of (agingData.rows || []) as AgingRow[]) {
        balanceMap[row.partyId] = row.total
      }
      setBalances(balanceMap)
    } catch {
      // fail silently — table will show empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = vendors.filter((v) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      v.name.toLowerCase().includes(q) ||
      (v.gstin ?? '').toLowerCase().includes(q) ||
      (v.phone ?? '').includes(q)
    )
  })

  // ── Panel helpers ─────────────────────────────────────────────────────────

  function openAddPanel() {
    setEditingVendor(null)
    setViewingVendor(null)
    setForm(EMPTY_FORM)
    setPanelError('')
    setPanelOpen(true)
  }

  function openEditPanel(v: Vendor) {
    setViewingVendor(null)
    setEditingVendor(v)
    setForm({
      name: v.name,
      type: v.type,
      gstin: v.gstin ?? '',
      pan: v.pan ?? '',
      phone: v.phone ?? '',
      email: v.email ?? '',
      address: v.address ?? '',
      city: v.city ?? '',
      state: v.state ?? '',
      pincode: v.pincode ?? '',
      creditDays: v.credit_days ?? 30,
      creditLimit: v.credit_limit ? String(v.credit_limit) : '',
    })
    setPanelError('')
    setPanelOpen(true)
  }

  function openViewPanel(v: Vendor) {
    setEditingVendor(null)
    setViewingVendor(v)
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditingVendor(null)
    setViewingVendor(null)
    setPanelError('')
  }

  // ── Form field updater ────────────────────────────────────────────────────

  function setField<K extends keyof VendorFormData>(key: K, value: VendorFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setPanelError('')
    try {
      const payload = {
        ...(editingVendor ? { id: editingVendor.id } : {}),
        name: form.name.trim(),
        type: form.type,
        gstin: form.gstin.trim() || undefined,
        pan: form.pan.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        creditDays: Number(form.creditDays) || 30,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
      }

      const method = editingVendor ? 'PATCH' : 'POST'
      const res = await fetch('/api/parties', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save vendor')

      closePanel()
      await fetchVendors()
    } catch (err: unknown) {
      setPanelError(err instanceof Error ? err.message : 'Failed to save vendor')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vendors</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your supplier / vendor master.</p>
        </div>
        <button
          onClick={openAddPanel}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Vendor
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
          &#128269;
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, GSTIN or phone…"
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            {search ? 'No vendors match your search.' : 'No vendors yet. Click "Add Vendor" to get started.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Name', 'GSTIN', 'Phone', 'Email', 'City', 'Outstanding Balance', 'Actions'].map(
                    (col) => (
                      <th
                        key={col}
                        className={`text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3 ${
                          col === 'Outstanding Balance' || col === 'Actions'
                            ? 'text-right'
                            : 'text-left'
                        }`}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((v) => {
                  const balance = balances[v.id] ?? 0
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                        {v.name}
                        {v.type === 'both' && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                            also customer
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">
                        {v.gstin ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                        {v.phone ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-[160px] truncate">
                        {v.email ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {v.city ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium">
                        <span className={balance > 0 ? 'text-red-600' : 'text-slate-500'}>
                          {balance > 0 ? formatCurrency(balance) : <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-3">
                        <button
                          onClick={() => openEditPanel(v)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openViewPanel(v)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-in Panel */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-800">
                {viewingVendor
                  ? viewingVendor.name
                  : editingVendor
                  ? `Edit — ${editingVendor.name}`
                  : 'Add Vendor'}
              </h2>
              <button
                onClick={closePanel}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none"
                aria-label="Close panel"
              >
                &#10005;
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {viewingVendor ? (
                <VendorDetail vendor={viewingVendor} balance={balances[viewingVendor.id] ?? 0} />
              ) : (
                <form id="vendor-form" onSubmit={handleSubmit} className="space-y-5">
                  {panelError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                      {panelError}
                    </div>
                  )}

                  {/* Name + Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Field label="Name" required>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setField('name', e.target.value)}
                          className={inputCls}
                          placeholder="Vendor / Supplier name"
                        />
                      </Field>
                    </div>
                    <Field label="Type" required>
                      <select
                        value={form.type}
                        onChange={(e) => setField('type', e.target.value as 'vendor' | 'both')}
                        className={inputCls}
                      >
                        <option value="vendor">Vendor only</option>
                        <option value="both">Vendor + Customer</option>
                      </select>
                    </Field>
                  </div>

                  {/* GSTIN + PAN */}
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="GSTIN">
                      <input
                        type="text"
                        value={form.gstin}
                        onChange={(e) => setField('gstin', e.target.value.toUpperCase())}
                        className={inputCls}
                        placeholder="22AAAAA0000A1Z5"
                        maxLength={15}
                      />
                    </Field>
                    <Field label="PAN">
                      <input
                        type="text"
                        value={form.pan}
                        onChange={(e) => setField('pan', e.target.value.toUpperCase())}
                        className={inputCls}
                        placeholder="AAAPL1234C"
                        maxLength={10}
                      />
                    </Field>
                  </div>

                  {/* Phone + Email */}
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Phone">
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setField('phone', e.target.value)}
                        className={inputCls}
                        placeholder="+91 98765 43210"
                      />
                    </Field>
                    <Field label="Email">
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setField('email', e.target.value)}
                        className={inputCls}
                        placeholder="vendor@example.com"
                      />
                    </Field>
                  </div>

                  {/* Address */}
                  <Field label="Address">
                    <textarea
                      value={form.address}
                      onChange={(e) => setField('address', e.target.value)}
                      className={`${inputCls} resize-none`}
                      rows={2}
                      placeholder="Street / Building / Area"
                    />
                  </Field>

                  {/* City + State + Pincode */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <Field label="City">
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => setField('city', e.target.value)}
                          className={inputCls}
                          placeholder="Mumbai"
                        />
                      </Field>
                    </div>
                    <div className="col-span-1">
                      <Field label="State">
                        <input
                          type="text"
                          value={form.state}
                          onChange={(e) => setField('state', e.target.value)}
                          className={inputCls}
                          placeholder="Maharashtra"
                        />
                      </Field>
                    </div>
                    <div className="col-span-1">
                      <Field label="Pincode">
                        <input
                          type="text"
                          value={form.pincode}
                          onChange={(e) => setField('pincode', e.target.value)}
                          className={inputCls}
                          placeholder="400001"
                          maxLength={6}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Credit Days + Credit Limit */}
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Credit Days">
                      <input
                        type="number"
                        min={0}
                        value={form.creditDays}
                        onChange={(e) => setField('creditDays', Number(e.target.value))}
                        className={inputCls}
                        placeholder="30"
                      />
                    </Field>
                    <Field label="Credit Limit (&#8377;)">
                      <input
                        type="number"
                        min={0}
                        value={form.creditLimit}
                        onChange={(e) => setField('creditLimit', e.target.value)}
                        className={inputCls}
                        placeholder="0 = unlimited"
                      />
                    </Field>
                  </div>
                </form>
              )}
            </div>

            {/* Panel Footer */}
            {!viewingVendor && (
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closePanel}
                  className="text-slate-600 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="vendor-form"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : editingVendor ? 'Save Changes' : 'Add Vendor'}
                </button>
              </div>
            )}
            {viewingVendor && (
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => openEditPanel(viewingVendor)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  Edit Vendor
                </button>
                <button
                  type="button"
                  onClick={closePanel}
                  className="text-slate-600 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Vendor Detail View ────────────────────────────────────────────────────────

function VendorDetail({ vendor, balance }: { vendor: Vendor; balance: number }) {
  const rows: Array<[string, string | number | null | undefined]> = [
    ['Type', vendor.type === 'both' ? 'Vendor + Customer' : 'Vendor'],
    ['GSTIN', vendor.gstin],
    ['PAN', vendor.pan],
    ['Phone', vendor.phone],
    ['Email', vendor.email],
    ['Address', vendor.address],
    ['City', vendor.city],
    ['State', vendor.state],
    ['Pincode', vendor.pincode],
    ['Credit Days', vendor.credit_days != null ? `${vendor.credit_days} days` : null],
    ['Credit Limit', vendor.credit_limit ? formatCurrency(vendor.credit_limit) : 'Unlimited'],
    ['Outstanding Balance', balance ? formatCurrency(balance) : '—'],
  ]

  return (
    <dl className="divide-y divide-slate-100">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-2 py-3 text-sm gap-2">
          <dt className="font-medium text-slate-500">{label}</dt>
          <dd className="text-slate-800 break-words">
            {value != null && value !== '' ? String(value) : <span className="text-slate-300">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
