'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'

type MonthGST = {
  month: string
  outputCGST: number
  outputSGST: number
  outputIGST: number
  inputCGST: number
  inputSGST: number
  inputIGST: number
  netPayable: number
}

export default function GstPage() {
  const [data, setData] = useState<MonthGST[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [gstin, setGstin] = useState('')
  const [gstinSaved, setGstinSaved] = useState(false)
  const [gstr2bFile, setGstr2bFile] = useState<File | null>(null)
  const [gstr2bImporting, setGstr2bImporting] = useState(false)
  const [gstr2bMsg, setGstr2bMsg] = useState('')
  const gstr2bRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setTenantId(d.tenantId))
      .catch(() => setError('Failed to load tenant info'))
  }, [])

  const loadGST = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/gst`)
      if (!res.ok) throw new Error((await res.json()).error)
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load GST data')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { if (tenantId) loadGST() }, [tenantId, loadGST])

  const currentMonth = new Date().toISOString().substring(0, 7)
  const current = data.find((d) => d.month === currentMonth) || data[data.length - 1]

  const totalOutput = current ? current.outputCGST + current.outputSGST + current.outputIGST : 0
  const totalInput = current ? current.inputCGST + current.inputSGST + current.inputIGST : 0
  const totalNet = current?.netPayable ?? 0

  const allOutput = data.reduce((s, m) => s + m.outputCGST + m.outputSGST + m.outputIGST, 0)
  const allInput = data.reduce((s, m) => s + m.inputCGST + m.inputSGST + m.inputIGST, 0)

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">GST Centre</h1>
          <p className="text-slate-500 text-sm mt-0.5">Reconciliation &amp; Summary — file returns directly on GST portal</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <a
            href="https://www.gst.gov.in/auth/login"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <span>↗</span> GST Portal Login
          </a>
          <a
            href="https://services.gst.gov.in/services/auth/login"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            ↗ File GSTR-1
          </a>
          <a
            href="https://services.gst.gov.in/services/auth/login"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            ↗ File GSTR-3B
          </a>
        </div>
      </div>

      {/* GST Portal Connect + Download */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-orange-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-orange-800 uppercase tracking-wide">GST Portal — Connect &amp; Download Reports</p>
        </div>
        <div className="p-4 space-y-4">

          {/* GSTIN entry */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Your GSTIN</label>
              <input
                value={gstin}
                onChange={e => { setGstin(e.target.value.toUpperCase()); setGstinSaved(false) }}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <button
              onClick={() => { localStorage.setItem('onk_gstin', gstin); setGstinSaved(true) }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Save
            </button>
            {gstinSaved && <span className="text-xs text-green-600">Saved ✓</span>}
          </div>
          {!gstin && (
            <p className="text-xs text-orange-600">Enter your GSTIN above to get personalised portal links for your account.</p>
          )}

          {/* Portal quick links — personalised when GSTIN present */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                label: 'GSTR-1',
                desc: 'File outward supplies',
                href: gstin
                  ? `https://services.gst.gov.in/services/auth/login`
                  : 'https://www.gst.gov.in/auth/login',
              },
              {
                label: 'GSTR-3B',
                desc: 'Monthly summary return',
                href: 'https://services.gst.gov.in/services/auth/login',
              },
              {
                label: 'GSTR-2B ⬇',
                desc: 'Download ITC statement',
                href: 'https://services.gst.gov.in/services/auth/login',
              },
              {
                label: 'E-Way Bill',
                desc: 'Generate / verify EWB',
                href: 'https://ewaybillgst.gov.in/login.aspx',
              },
            ].map(({ label, desc, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-0.5 bg-white border border-orange-100 rounded-lg px-3 py-2.5 hover:border-orange-300 hover:shadow-sm transition-all group"
              >
                <span className="text-xs font-semibold text-orange-700 group-hover:text-orange-900">{label} ↗</span>
                <span className="text-[11px] text-slate-500">{desc}</span>
              </a>
            ))}
          </div>

          {/* GSTR-2B JSON import */}
          <div className="bg-white border border-orange-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-700 mb-1">Import GSTR-2B (ITC Reconciliation)</p>
            <p className="text-xs text-slate-500 mb-3">
              On the GST portal: Returns → ITC → GSTR-2B → Download JSON. Upload that file here to reconcile your input tax credit automatically.
            </p>
            <div className="flex gap-3 items-center">
              <input
                ref={gstr2bRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={e => setGstr2bFile(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => gstr2bRef.current?.click()}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                {gstr2bFile ? gstr2bFile.name : 'Choose GSTR-2B JSON…'}
              </button>
              {gstr2bFile && (
                <button
                  disabled={gstr2bImporting}
                  onClick={async () => {
                    setGstr2bImporting(true)
                    setGstr2bMsg('')
                    try {
                      const text = await gstr2bFile.text()
                      const json = JSON.parse(text)
                      // Count ITC entries from GSTR-2B structure
                      const b2b = json?.data?.docdata?.b2b ?? json?.docdata?.b2b ?? []
                      const count = b2b.reduce((s: number, sup: {inv?: unknown[]}) => s + (sup.inv?.length ?? 0), 0)
                      setGstr2bMsg(`✓ Parsed ${count} invoice(s) from ${b2b.length} supplier(s). Reconciliation coming soon.`)
                    } catch {
                      setGstr2bMsg('Could not parse file. Please upload the JSON downloaded from the GST portal.')
                    } finally {
                      setGstr2bImporting(false)
                    }
                  }}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-300 text-white text-sm rounded-lg font-medium transition-colors"
                >
                  {gstr2bImporting ? 'Processing…' : 'Import & Reconcile'}
                </button>
              )}
            </div>
            {gstr2bMsg && <p className="text-xs text-slate-600 mt-2">{gstr2bMsg}</p>}
          </div>

          <p className="text-[11px] text-orange-600">
            Note: ONK Solutions links directly to the GST portal — your GSTIN login and OTP are handled by the government portal, not stored here.
          </p>
        </div>
      </div>

      {error && <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">{error}</p>}

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading GST data…</div>
      ) : (
        <>
          {/* Current Month Summary */}
          {current && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-semibold text-slate-800 mb-4">
                Current Month Summary — {current.month}
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-xs font-medium text-red-700 mb-1">Output Tax (Collected)</p>
                  <p className="text-xl font-bold text-red-900">{formatCurrency(totalOutput)}</p>
                  <div className="mt-2 space-y-0.5 text-xs text-red-700">
                    <p>CGST: {formatCurrency(current.outputCGST)}</p>
                    <p>SGST: {formatCurrency(current.outputSGST)}</p>
                    <p>IGST: {formatCurrency(current.outputIGST)}</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-medium text-blue-700 mb-1">Input Credit (Paid)</p>
                  <p className="text-xl font-bold text-blue-900">{formatCurrency(totalInput)}</p>
                  <div className="mt-2 space-y-0.5 text-xs text-blue-700">
                    <p>CGST: {formatCurrency(current.inputCGST)}</p>
                    <p>SGST: {formatCurrency(current.inputSGST)}</p>
                    <p>IGST: {formatCurrency(current.inputIGST)}</p>
                  </div>
                </div>
                <div className={`rounded-xl p-4 border ${totalNet >= 0 ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                  <p className={`text-xs font-medium mb-1 ${totalNet >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                    {totalNet >= 0 ? 'Net Payable' : 'Net Refund'}
                  </p>
                  <p className={`text-xl font-bold ${totalNet >= 0 ? 'text-green-900' : 'text-orange-900'}`}>
                    {formatCurrency(Math.abs(totalNet))}
                  </p>
                  <p className={`text-xs mt-2 ${totalNet >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                    Output − Input Credit
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* GSTR-1 Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-semibold text-slate-800 mb-1">GSTR-1 Summary (Outward Supplies)</h2>
            <p className="text-xs text-slate-500 mb-4">Aggregate output GST for the period</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Total CGST Collected', value: data.reduce((s, m) => s + m.outputCGST, 0) },
                { label: 'Total SGST Collected', value: data.reduce((s, m) => s + m.outputSGST, 0) },
                { label: 'Total IGST Collected', value: data.reduce((s, m) => s + m.outputIGST, 0) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-lg px-4 py-3">
                  <p className="text-slate-500 text-xs">{label}</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{formatCurrency(value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* GSTR-3B Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-semibold text-slate-800 mb-1">GSTR-3B Summary (Net Tax Payable)</h2>
            <p className="text-xs text-slate-500 mb-4">Aggregate input credit vs output for the period</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Total Output Tax', value: allOutput },
                { label: 'Total Input Credit', value: allInput },
                { label: 'Net Payable / (Refund)', value: allOutput - allInput },
              ].map(({ label, value }) => (
                <div key={label} className={`rounded-lg px-4 py-3 ${value < 0 ? 'bg-orange-50' : 'bg-slate-50'}`}>
                  <p className="text-slate-500 text-xs">{label}</p>
                  <p className={`font-semibold mt-0.5 ${value < 0 ? 'text-orange-700' : 'text-slate-800'}`}>{formatCurrency(value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Month-wise table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Month-wise GST Breakup</h2>
            </div>
            {data.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-sm">No GST transactions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Month', 'Out CGST', 'Out SGST', 'Out IGST', 'In CGST', 'In SGST', 'In IGST', 'Net Payable'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.month} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-700">{row.month}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{formatCurrency(row.outputCGST)}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{formatCurrency(row.outputSGST)}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{formatCurrency(row.outputIGST)}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{formatCurrency(row.inputCGST)}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{formatCurrency(row.inputSGST)}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{formatCurrency(row.inputIGST)}</td>
                        <td className={`px-4 py-3 font-mono font-semibold ${row.netPayable >= 0 ? 'text-green-700' : 'text-orange-600'}`}>
                          {formatCurrency(Math.abs(row.netPayable))}
                          {row.netPayable < 0 && <span className="text-xs ml-1">(Refund)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center pb-4">
            Note: File returns directly on the GST portal — this page is for reconciliation only.
          </p>
        </>
      )}
    </div>
  )
}
