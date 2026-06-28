'use client'

import { useEffect, useState, useRef } from 'react'
import InvoiceTemplate from '@/components/invoice/InvoiceTemplate'
import { MODULES, ALL_MODULE_KEYS } from '@/lib/modules'
import { ModuleKey } from '@/types'

function ModulesSection() {
  const [moduleState, setModuleState] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/modules')
      .then(r => r.json())
      .then(d => {
        const state: Record<string, boolean> = {}
        for (const m of d.modules ?? []) state[m.module_key] = m.is_enabled
        setModuleState(state)
      })
      .finally(() => setLoading(false))
  }, [])

  async function toggle(key: ModuleKey, enabled: boolean) {
    setSaving(key)
    try {
      await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleKey: key, enabled }),
      })
      setModuleState(s => ({ ...s, [key]: enabled }))
    } finally {
      setSaving(null)
    }
  }

  if (loading) return null

  const displayKeys = ALL_MODULE_KEYS.filter(k =>
    !['income', 'tds', 'cash', 'cash_flow', 'depreciation', 'loans', 'stock', 'assets'].includes(k)
  )

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800">Enabled Modules</h2>
        <p className="text-xs text-slate-500 mt-0.5">Toggle which sections appear in the sidebar. Changes take effect on next page load.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {displayKeys.map(key => {
          const mod = MODULES[key]
          const enabled = !!moduleState[key]
          return (
            <label key={key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${enabled ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
              <input
                type="checkbox"
                checked={enabled}
                disabled={saving === key}
                onChange={e => toggle(key, e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-800">{mod.label}</p>
                <p className="text-xs text-slate-500 leading-tight">{mod.description}</p>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

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
  invoiceTitle: string
  invoicePrefix: string
  bankName: string
  bankAccountNo: string
  bankIFSC: string
  bankBranch: string
  invoiceFooter: string
  termsAndConditions: string
  showBankDetails: boolean
  showSeal: boolean
  showSignature: boolean
  logoUrl: string
  sealUrl: string
  signatureUrl: string
}

const DEFAULT_INVOICE_SETTINGS: InvoicePersonalization = {
  invoiceTitle: 'Tax Invoice',
  invoicePrefix: 'INV-',
  bankName: '',
  bankAccountNo: '',
  bankIFSC: '',
  bankBranch: '',
  invoiceFooter: '',
  termsAndConditions: '',
  showBankDetails: true,
  showSeal: true,
  showSignature: true,
  logoUrl: '',
  sealUrl: '',
  signatureUrl: '',
}

const STORAGE_KEY = 'onk_invoice_settings'

function ImageUpload({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (base64: string) => void
  hint?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
      <div className="flex items-center gap-4">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-16 w-16 object-contain rounded border border-slate-200 bg-slate-50" />
        ) : (
          <div className="h-16 w-16 rounded border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 text-xs">
            None
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
          >
            {value ? 'Replace' : 'Upload'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(''); if (inputRef.current) inputRef.current.value = '' }}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Remove
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    name: '', gstin: '', pan: '', phone: '', email: '',
    address: '', city: '', state: '', pincode: '',
    financial_year_start: 4, logo_url: null,
  })
  const [invoice, setInvoice] = useState<InvoicePersonalization>(DEFAULT_INVOICE_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings) setSettings(d.settings)
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false))

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setInvoice({ ...DEFAULT_INVOICE_SETTINGS, ...JSON.parse(saved) })
    } catch {
      // ignore
    }
  }, [])

  function saveInvoiceSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(invoice))
    } catch {
      // ignore
    }
  }

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
      saveInvoiceSettings()
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

  const invField = (label: string, key: keyof InvoicePersonalization, placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="text"
        value={(invoice[key] as string) ?? ''}
        onChange={e => setInvoice(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )

  // Sample data for preview
  const previewProps = {
    companyName: settings.name || 'Your Company Name',
    companyAddress: settings.address || '123, Sample Street',
    companyCity: settings.city || 'Mumbai',
    companyState: settings.state || 'Maharashtra',
    companyPincode: settings.pincode || '400001',
    companyPhone: settings.phone || '9876543210',
    companyEmail: settings.email || 'info@company.com',
    companyGSTIN: settings.gstin || '27AABCU9603R1ZX',
    companyPAN: settings.pan || 'AABCU9603R',
    logoUrl: invoice.logoUrl || undefined,
    sealUrl: invoice.sealUrl || undefined,
    signatureUrl: invoice.signatureUrl || undefined,
    invoiceNumber: `${invoice.invoicePrefix}0001`,
    invoiceDate: new Date().toLocaleDateString('en-IN'),
    dueDate: new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-IN'),
    customerName: 'Sample Customer Pvt Ltd',
    customerAddress: '456, Customer Lane, Delhi - 110001',
    customerGSTIN: '07AAACD1234M1ZV',
    items: [
      { description: 'Professional Services - Web Development', qty: 1, rate: 50000, gstRate: 18, amount: 50000, cgst: 4500, sgst: 4500, igst: 0 },
      { description: 'Annual Maintenance Contract', qty: 2, rate: 10000, gstRate: 18, amount: 20000, cgst: 1800, sgst: 1800, igst: 0 },
    ],
    subtotal: 70000,
    totalCGST: 6300,
    totalSGST: 6300,
    totalIGST: 0,
    totalAmount: 82600,
    invoiceTitle: invoice.invoiceTitle,
    bankName: invoice.bankName,
    bankAccountNo: invoice.bankAccountNo,
    bankIFSC: invoice.bankIFSC,
    bankBranch: invoice.bankBranch,
    footerText: invoice.invoiceFooter,
    showBankDetails: invoice.showBankDetails,
    showSeal: invoice.showSeal,
    showSignature: invoice.showSignature,
    termsAndConditions: invoice.termsAndConditions,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  async function seedDemo() {
    if (!confirm('This will add sample journal entries (invoices, purchases, payroll, etc.) to your company. Continue?')) return
    setSeeding(true)
    setSeedMsg('')
    try {
      const res = await fetch('/api/seed-demo', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setSeedMsg(`✓ Demo data loaded — ${d.created} journal entries created.`)
    } catch (e: unknown) {
      setSeedMsg('✗ ' + (e instanceof Error ? e.message : 'Failed to seed demo data'))
    } finally {
      setSeeding(false)
    }
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
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Invoice Personalization</h2>
            <p className="text-xs text-slate-500 mt-0.5">Customize how your invoices look to customers. Saved locally.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>Preview Invoice</span>
          </button>
        </div>

        {/* Branding images */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Branding</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <ImageUpload
              label="Company Logo"
              value={invoice.logoUrl}
              onChange={v => setInvoice(p => ({ ...p, logoUrl: v }))}
              hint="PNG or JPG, appears top-left on invoice"
            />
            <ImageUpload
              label="Digital Seal"
              value={invoice.sealUrl}
              onChange={v => setInvoice(p => ({ ...p, sealUrl: v }))}
              hint="Company stamp/seal image"
            />
            <ImageUpload
              label="Authorized Signatory"
              value={invoice.signatureUrl}
              onChange={v => setInvoice(p => ({ ...p, signatureUrl: v }))}
              hint="Signature image of authorized person"
            />
          </div>
        </div>

        {/* Invoice settings */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Invoice Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Title</label>
              <select
                value={invoice.invoiceTitle}
                onChange={e => setInvoice(p => ({ ...p, invoiceTitle: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Tax Invoice">Tax Invoice</option>
                <option value="Proforma Invoice">Proforma Invoice</option>
                <option value="Service Invoice">Service Invoice</option>
                <option value="Receipt Voucher">Receipt Voucher</option>
              </select>
            </div>
            {invField('Invoice Number Prefix', 'invoicePrefix', 'INV-')}
          </div>
        </div>

        {/* Bank details */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Bank Details on Invoice</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {invField('Bank Name', 'bankName', 'e.g., HDFC Bank')}
            {invField('Account Number', 'bankAccountNo', 'e.g., 50100123456789')}
            {invField('IFSC Code', 'bankIFSC', 'e.g., HDFC0001234')}
            {invField('Branch', 'bankBranch', 'e.g., Andheri West, Mumbai')}
          </div>
        </div>

        {/* Footer & Terms */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Footer & Terms</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Footer Text</label>
            <textarea
              value={invoice.invoiceFooter}
              onChange={e => setInvoice(p => ({ ...p, invoiceFooter: e.target.value }))}
              rows={2}
              placeholder="e.g., Thank you for your business!"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Terms & Conditions</label>
            <textarea
              value={invoice.termsAndConditions}
              onChange={e => setInvoice(p => ({ ...p, termsAndConditions: e.target.value }))}
              rows={4}
              placeholder={'1. Payment due within 30 days.\n2. Goods once sold will not be returned.\n3. Subject to jurisdiction of local courts.'}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Display Options</h3>
          {[
            { key: 'showBankDetails' as const, label: 'Show bank details on invoice' },
            { key: 'showSeal' as const, label: 'Show company seal on invoice' },
            { key: 'showSignature' as const, label: 'Show authorized signature on invoice' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={invoice[key] as boolean}
                onChange={e => setInvoice(p => ({ ...p, [key]: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Module Management */}
      <ModulesSection />

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Invoice Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 no-print">
              <div>
                <h3 className="font-semibold text-slate-800">Invoice Preview</h3>
                <p className="text-xs text-slate-500">This is a sample preview with dummy data</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Print
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-sm text-slate-500 hover:text-slate-700 border border-slate-200 px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto">
              <InvoiceTemplate {...previewProps} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
