'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

const GST_RATES = [0, 5, 12, 18, 28]

// RCM applies when the VENDOR is unregistered or falls under specific categories
const RCM_CATEGORIES = [
  { id: 'freight',   label: 'Freight / Transport (GTA)' },
  { id: 'legal',     label: 'Legal Services' },
  { id: 'security',  label: 'Security Services (unregistered)' },
  { id: 'manpower',  label: 'Manpower (unregistered supplier)' },
  { id: 'rent',      label: 'Rent from unregistered landlord' },
  { id: 'other_rcm', label: 'Other RCM category' },
]

const PURCHASE_CATEGORIES = [
  { id: 'goods',      label: 'Goods / Stock',           accountCode: '5200' },
  { id: 'services',   label: 'Services Received',       accountCode: '5000' },
  { id: 'rent',       label: 'Rent / Office Space',     accountCode: '5300' },
  { id: 'salary',     label: 'Salary / Wages',          accountCode: '5100' },
  { id: 'travel',     label: 'Travel & Conveyance',     accountCode: '5700' },
  { id: 'office',     label: 'Office Supplies',         accountCode: '5500' },
  { id: 'utility',    label: 'Electricity / Utility',   accountCode: '5400' },
  { id: 'asset',      label: 'Asset Purchase',          accountCode: '1200' },
  { id: 'other',      label: 'Other',                   accountCode: '5920' },
]

interface PurchaseEntry {
  date: string
  vendorName: string
  vendorId: string
  billNumber: string
  category: string
  description: string
  amount: number
  gstRate: number
  gstType: 'intra' | 'inter' | 'none'
  isRcm: boolean
  rcmCategory: string
  paidNow: boolean
  paidVia: string
  tdsApplicable: boolean
  tdsRate: number
  tdsSection: string
  reference: string
}

interface Props {
  vendors: { id: string; name: string }[]
  bankAccounts: { id: string; name: string }[]
  onSubmit: (data: PurchaseEntry) => Promise<void>
}

const TDS_SECTIONS = [
  { section: '194C', label: '194C — Contractor (1% individual, 2% company)', rate: 2 },
  { section: '194J', label: '194J — Professional / Technical services (10%)', rate: 10 },
  { section: '194I', label: '194I — Rent (10%)', rate: 10 },
  { section: '194H', label: '194H — Commission / Brokerage (5%)', rate: 5 },
  { section: '194A', label: '194A — Interest (10%)', rate: 10 },
  { section: '194M', label: '194M — Contractor/Professional by individual (5%)', rate: 5 },
  { section: '194Q', label: '194Q — Purchase of goods (0.1%)', rate: 0.1 },
]

export default function PurchaseEntryForm({ vendors, bankAccounts, onSubmit }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState<PurchaseEntry>({
    date: today,
    vendorName: '',
    vendorId: '',
    billNumber: '',
    category: '',
    description: '',
    amount: 0,
    gstRate: 18,
    gstType: 'intra',
    isRcm: false,
    rcmCategory: '',
    paidNow: false,
    paidVia: bankAccounts[0]?.id || 'cash',
    tdsApplicable: false,
    tdsRate: 2,
    tdsSection: '194C',
    reference: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newVendor, setNewVendor] = useState(false)

  // Tax calculations
  const base = form.amount
  const gstAmount = form.gstType !== 'none' && form.gstRate > 0
    ? Math.round((base * form.gstRate) / 100 * 100) / 100
    : 0
  const cgst = form.gstType === 'intra' ? gstAmount / 2 : 0
  const sgst = form.gstType === 'intra' ? gstAmount / 2 : 0
  const igst = form.gstType === 'inter' ? gstAmount : 0
  const tdsAmount = form.tdsApplicable
    ? Math.round((base * form.tdsRate) / 100 * 100) / 100
    : 0
  // On RCM: GST is paid directly to government, not to vendor
  const payableToVendor = form.isRcm
    ? base - tdsAmount                    // No GST to vendor; govt paid separately
    : base + gstAmount - tdsAmount        // Normal: GST paid to vendor, TDS deducted

  function set<K extends keyof PurchaseEntry>(key: K, value: PurchaseEntry[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleTdsSectionChange(section: string) {
    const found = TDS_SECTIONS.find((s) => s.section === section)
    set('tdsSection', section)
    if (found) set('tdsRate', found.rate)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category || form.amount <= 0) {
      setError('Please select what was purchased and enter the amount.')
      return
    }
    if (!form.vendorId && !form.vendorName) {
      setError('Please select or enter a vendor name.')
      return
    }
    if (form.isRcm && !form.rcmCategory) {
      setError('Please select the RCM category.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onSubmit(form)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Date + Bill Number */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Bill / Invoice Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendor&apos;s Bill Number</label>
          <input
            type="text"
            value={form.billNumber}
            onChange={(e) => set('billNumber', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder="e.g. INV-001"
          />
        </div>
      </div>

      {/* Vendor */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-slate-700">Purchased from (Vendor)</label>
          <button type="button" onClick={() => setNewVendor((v) => !v)}
            className="text-xs text-blue-600 hover:underline">
            {newVendor ? 'Pick existing vendor' : '+ Add new vendor'}
          </button>
        </div>
        {newVendor ? (
          <input type="text" value={form.vendorName}
            onChange={(e) => set('vendorName', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Vendor / supplier name" />
        ) : (
          <select value={form.vendorId}
            onChange={(e) => set('vendorId', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">— Select vendor —</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        )}
      </div>

      {/* Category tiles */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">What was purchased?</label>
        <div className="grid grid-cols-3 gap-2">
          {PURCHASE_CATEGORIES.map((cat) => (
            <button key={cat.id} type="button" onClick={() => set('category', cat.id)}
              className={`px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-all ${
                form.category === cat.id
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              }`}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
        <input type="text" value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Office stationery, Security guard deployment June 2025" />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (before GST) ₹</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
          <input type="number" min="0" step="0.01" value={form.amount || ''}
            onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
            className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00" />
        </div>
      </div>

      {/* GST */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">GST Rate on Bill</label>
          <select value={form.gstRate} onChange={(e) => set('gstRate', Number(e.target.value))}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {GST_RATES.map((r) => <option key={r} value={r}>{r === 0 ? 'No GST' : `${r}%`}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">GST Type</label>
          <select value={form.gstType}
            onChange={(e) => set('gstType', e.target.value as PurchaseEntry['gstType'])}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="intra">Within State (CGST + SGST)</option>
            <option value="inter">Outside State (IGST)</option>
            <option value="none">No GST on this purchase</option>
          </select>
        </div>
      </div>

      {/* RCM Toggle */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <input type="checkbox" id="rcm" checked={form.isRcm}
            onChange={(e) => set('isRcm', e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-slate-300 text-amber-600" />
          <div>
            <label htmlFor="rcm" className="text-sm font-semibold text-amber-900 cursor-pointer">
              Reverse Charge Mechanism (RCM)
            </label>
            <p className="text-xs text-amber-700 mt-0.5">
              Tick this if GST is to be paid directly to the government — not to the vendor.
              Common for freight (GTA), legal services, and unregistered suppliers.
            </p>
          </div>
        </div>
        {form.isRcm && (
          <div>
            <label className="block text-xs font-medium text-amber-900 mb-1.5">RCM Category</label>
            <select value={form.rcmCategory}
              onChange={(e) => set('rcmCategory', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
              <option value="">— Select RCM category —</option>
              {RCM_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* TDS */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <input type="checkbox" id="tds" checked={form.tdsApplicable}
            onChange={(e) => set('tdsApplicable', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600" />
          <label htmlFor="tds" className="text-sm font-semibold text-slate-800 cursor-pointer">
            Deduct TDS on this payment
          </label>
        </div>
        {form.tdsApplicable && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">TDS Section</label>
            <select value={form.tdsSection} onChange={(e) => handleTdsSectionChange(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {TDS_SECTIONS.map((s) => <option key={s.section} value={s.section}>{s.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Live Bill Breakdown */}
      {form.amount > 0 && (
        <div className={`rounded-xl p-4 space-y-1.5 text-sm border ${
          form.isRcm ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'
        }`}>
          <p className={`font-semibold mb-2 ${form.isRcm ? 'text-amber-900' : 'text-blue-900'}`}>
            Bill Summary {form.isRcm && '(RCM applies)'}
          </p>
          <div className="flex justify-between text-slate-700">
            <span>Bill Amount</span>
            <span className="font-mono">{formatCurrency(base)}</span>
          </div>
          {gstAmount > 0 && !form.isRcm && form.gstType === 'intra' && (
            <>
              <div className="flex justify-between text-slate-600">
                <span>CGST @ {form.gstRate / 2}% (Input Tax Credit)</span>
                <span className="font-mono">{formatCurrency(cgst)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST @ {form.gstRate / 2}% (Input Tax Credit)</span>
                <span className="font-mono">{formatCurrency(sgst)}</span>
              </div>
            </>
          )}
          {gstAmount > 0 && !form.isRcm && form.gstType === 'inter' && (
            <div className="flex justify-between text-slate-600">
              <span>IGST @ {form.gstRate}% (Input Tax Credit)</span>
              <span className="font-mono">{formatCurrency(igst)}</span>
            </div>
          )}
          {form.isRcm && gstAmount > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>GST @ {form.gstRate}% — paid to Govt directly (RCM)</span>
              <span className="font-mono">{formatCurrency(gstAmount)}</span>
            </div>
          )}
          {form.tdsApplicable && (
            <div className="flex justify-between text-red-700">
              <span>TDS Deducted ({form.tdsSection} @ {form.tdsRate}%)</span>
              <span className="font-mono">- {formatCurrency(tdsAmount)}</span>
            </div>
          )}
          <div className={`flex justify-between font-bold border-t pt-1.5 mt-1 ${
            form.isRcm ? 'border-amber-200 text-amber-900' : 'border-blue-200 text-blue-900'
          }`}>
            <span>Net Amount Payable to Vendor</span>
            <span className="font-mono">{formatCurrency(payableToVendor)}</span>
          </div>
        </div>
      )}

      {/* Payment */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input type="checkbox" id="paidNow" checked={form.paidNow}
            onChange={(e) => set('paidNow', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600" />
          <label htmlFor="paidNow" className="text-sm font-medium text-slate-700">
            Payment made now (not on credit)
          </label>
        </div>
        {form.paidNow && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Paid from</label>
            <select value={form.paidVia} onChange={(e) => set('paidVia', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="cash">Cash in Hand</option>
              {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
        {loading ? 'Saving…' : 'Save Purchase Entry'}
      </button>
      <p className="text-center text-xs text-slate-400">
        All accounting entries including TDS and RCM are created automatically.
      </p>
    </form>
  )
}
