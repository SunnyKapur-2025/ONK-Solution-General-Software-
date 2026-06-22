'use client'

import { useEffect, useState } from 'react'

interface Settings {
  name: string
  gstin: string
  pan: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
  financial_year_start: number
  logo_url: string | null
}

interface InvoicePersonalization {
  invoicePrefix: string
  invoiceFooter: string
  showBankDetails: boolean
  showGstin: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    name: '', gstin: '', pan: '', phone: '', email: '',
    address: '', city: '', state: '', pincode: '',
    financial_year_start: 4, logo_url: null,
  })
  const [invoicePersonalization, setInvoicePersonalization] = useState<InvoicePersonalization>({
    invoicePrefix: 'INV-',
    invoiceFooter: '',
    showBankDetails: true,
    showGstin: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings) setSettings(d.settings)
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSuccess('')
    setError('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settings.name,
          gstin: settings.gstin,
          pan: settings.pan,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
          city: settings.city,
          state: settings.state,
          pincode: settings.pincode,
          financial_year_start: settings.financial_year_start,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSettings(data.settings)
      setSuccess('Settings saved successfully.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof Settings, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={(settings[key] as string) ?? ''}
        onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your company profile and preferences.</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Company Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Company Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('Company Name', 'name')}
          {field('GSTIN', 'gstin')}
          {field('PAN', 'pan')}
          {field('Phone', 'phone', 'tel')}
          {field('Email', 'email', 'email')}
        </div>
        {field('Address', 'address')}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {field('City', 'city')}
          {field('State', 'state')}
          {field('Pincode', 'pincode')}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year Start</label>
          <select
            value={settings.financial_year_start}
            onChange={e => setSettings(s => ({ ...s, financial_year_start: Number(e.target.value) }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={4}>April (Indian FY)</option>
            <option value={1}>January (Calendar Year)</option>
          </select>
        </div>
      </div>

      {/* Invoice Personalization */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Invoice Personalization</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Prefix</label>
            <input
              type="text"
              value={invoicePersonalization.invoicePrefix}
              onChange={e => setInvoicePersonalization(p => ({ ...p, invoicePrefix: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="INV-"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Footer Text</label>
          <textarea
            value={invoicePersonalization.invoiceFooter}
            onChange={e => setInvoicePersonalization(p => ({ ...p, invoiceFooter: e.target.value }))}
            rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Thank you for your business!"
          />
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={invoicePersonalization.showBankDetails}
              onChange={e => setInvoicePersonalization(p => ({ ...p, showBankDetails: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Show bank details on invoice</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={invoicePersonalization.showGstin}
              onChange={e => setInvoicePersonalization(p => ({ ...p, showGstin: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Show GSTIN on invoice</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
