'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatCurrency } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

type Party = {
  id: string
  name: string
  type: 'customer' | 'supplier' | 'both'
  gstin: string | null
  pan: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  credit_days: number | null
  credit_limit: number | null
  outstanding_balance: number | null
}

type CustomerForm = {
  name: string
  type: 'customer' | 'both'
  gstin: string
  pan: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
  credit_days: string
  credit_limit: string
}

const EMPTY_FORM: CustomerForm = {
  name: '',
  type: 'customer',
  gstin: '',
  pan: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  credit_days: '30',
  credit_limit: '',
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
]

// ── Main Component ───────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Panel state
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Party | null>(null)
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // View panel state
  const [viewCustomer, setViewCustomer] = useState<Party | null>(null)
  const [viewPanelOpen, setViewPanelOpen] = useState(false)

  // Search
  const [search, setSearch] = useState('')

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/parties?type=customer')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data: Party[] = await res.json()
      setCustomers(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) =>
      (c.name?.toLowerCase().includes(q)) ||
      (c.gstin?.toLowerCase().includes(q)) ||
      (c.phone?.toLowerCase().includes(q))
    )
  }, [customers, search])

  // ── Panel helpers ──────────────────────────────────────────────────────────

  function openAddPanel() {
    setEditingCustomer(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setFormSuccess('')
    setPanelOpen(true)
  }

  function openEditPanel(customer: Party) {
    setEditingCustomer(customer)
    setForm({
      name: customer.name ?? '',
      type: customer.type === 'supplier' ? 'customer' : (customer.type as 'customer' | 'both'),
      gstin: customer.gstin ?? '',
      pan: customer.pan ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      city: customer.city ?? '',
      state: customer.state ?? '',
      pincode: customer.pincode ?? '',
      credit_days: customer.credit_days != null ? String(customer.credit_days) : '30',
      credit_limit: customer.credit_limit != null ? String(customer.credit_limit) : '',
    })
    setFormError('')
    setFormSuccess('')
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setEditingCustomer(null)
  }

  function openViewPanel(customer: Party) {
    setViewCustomer(customer)
    setViewPanelOpen(true)
  }

  function closeViewPanel() {
    setViewPanelOpen(false)
    setViewCustomer(null)
  }

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!form.name.trim()) {
      setFormError('Customer name is required.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        gstin: form.gstin.trim() || null,
        pan: form.pan.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
        pincode: form.pincode.trim() || null,
        credit_days: form.credit_days ? parseInt(form.credit_days, 10) : 30,
        credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : null,
      }

      const url = editingCustomer ? `/api/parties/${editingCustomer.id}` : '/api/parties'
      const method = editingCustomer ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      setFormSuccess(editingCustomer ? 'Customer updated successfully.' : 'Customer added successfully.')
      await loadCustomers()
      setTimeout(closePanel, 900)
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to save customer')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your customer master records</p>
          </div>
          <button
            onClick={openAddPanel}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Customer
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, GSTIN or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Loading customers…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm font-medium text-gray-500">
                {search ? 'No customers match your search' : 'No customers yet'}
              </p>
              {!search && (
                <button onClick={openAddPanel} className="mt-3 text-sm text-blue-600 hover:underline">
                  Add your first customer
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Name</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">GSTIN</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Phone</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Email</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">City</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Outstanding</th>
                    <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((customer) => {
                    const balance = customer.outstanding_balance ?? 0
                    return (
                      <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          {customer.type === 'both' && (
                            <span className="text-xs bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 mt-0.5 inline-block">Customer & Supplier</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {customer.gstin || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {customer.phone || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {customer.email || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {customer.city || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {balance !== 0 ? formatCurrency(Math.abs(balance)) : '—'}
                          </span>
                          {balance > 0 && <div className="text-xs text-red-400">Receivable</div>}
                          {balance < 0 && <div className="text-xs text-green-500">Advance</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openViewPanel(customer)}
                              title="View"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openEditPanel(customer)}
                              title="Edit"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            Showing {filtered.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Slide-in Add/Edit Panel ─────────────────────────────────────────── */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={closePanel}
          />
          {/* Drawer */}
          <aside className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <button
                onClick={closePanel}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Alerts */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  {formSuccess}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Customer / business name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="customer">Customer</option>
                  <option value="both">Customer &amp; Supplier</option>
                </select>
              </div>

              {/* GSTIN / PAN */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    name="gstin"
                    value={form.gstin}
                    onChange={handleFormChange}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                  <input
                    name="pan"
                    value={form.pan}
                    onChange={handleFormChange}
                    placeholder="AAAAA0000A"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Phone / Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="contact@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleFormChange}
                  placeholder="Street address"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* City / State / Pincode */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleFormChange}
                    placeholder="Mumbai"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <select
                    name="state"
                    value={form.state}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <input
                    name="pincode"
                    value={form.pincode}
                    onChange={handleFormChange}
                    placeholder="400001"
                    maxLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Credit Days / Credit Limit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Days</label>
                  <input
                    name="credit_days"
                    type="number"
                    min={0}
                    value={form.credit_days}
                    onChange={handleFormChange}
                    placeholder="30"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit (&#8377;)</label>
                  <input
                    name="credit_limit"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.credit_limit}
                    onChange={handleFormChange}
                    placeholder="e.g. 100000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </form>

            {/* Panel footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                type="button"
                onClick={closePanel}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="customer-form-internal"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Saving…' : editingCustomer ? 'Update Customer' : 'Add Customer'}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ── Slide-in View Panel ─────────────────────────────────────────────── */}
      {viewPanelOpen && viewCustomer && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={closeViewPanel}
          />
          <aside className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
              <button
                onClick={closeViewPanel}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold">
                  {viewCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">{viewCustomer.name}</div>
                  <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                    {viewCustomer.type === 'both' ? 'Customer & Supplier' : 'Customer'}
                  </span>
                </div>
              </div>

              {/* Outstanding balance card */}
              <div className={`p-4 rounded-xl border ${(viewCustomer.outstanding_balance ?? 0) > 0 ? 'bg-red-50 border-red-200' : (viewCustomer.outstanding_balance ?? 0) < 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="text-xs font-medium text-gray-500 mb-1">Outstanding Balance</div>
                <div className={`text-2xl font-bold ${(viewCustomer.outstanding_balance ?? 0) > 0 ? 'text-red-700' : (viewCustomer.outstanding_balance ?? 0) < 0 ? 'text-green-700' : 'text-gray-400'}`}>
                  {viewCustomer.outstanding_balance != null && viewCustomer.outstanding_balance !== 0
                    ? formatCurrency(Math.abs(viewCustomer.outstanding_balance))
                    : '—'}
                </div>
                {(viewCustomer.outstanding_balance ?? 0) > 0 && <div className="text-xs text-red-500 mt-0.5">Amount receivable from customer</div>}
                {(viewCustomer.outstanding_balance ?? 0) < 0 && <div className="text-xs text-green-600 mt-0.5">Advance / credit balance</div>}
              </div>

              {/* Details grid */}
              <div className="space-y-3">
                <DetailRow label="GSTIN" value={viewCustomer.gstin} mono />
                <DetailRow label="PAN" value={viewCustomer.pan} mono />
                <DetailRow label="Phone" value={viewCustomer.phone} />
                <DetailRow label="Email" value={viewCustomer.email} />
                <DetailRow label="Address" value={viewCustomer.address} />
                <DetailRow label="City" value={viewCustomer.city} />
                <DetailRow label="State" value={viewCustomer.state} />
                <DetailRow label="Pincode" value={viewCustomer.pincode} />
                <DetailRow label="Credit Days" value={viewCustomer.credit_days != null ? `${viewCustomer.credit_days} days` : null} />
                <DetailRow label="Credit Limit" value={viewCustomer.credit_limit != null ? formatCurrency(viewCustomer.credit_limit) : null} />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => { closeViewPanel(); openEditPanel(viewCustomer) }}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Customer
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

// ── Helper component ─────────────────────────────────────────────────────────

function DetailRow({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-gray-300">—</span>}
      </span>
    </div>
  )
}
