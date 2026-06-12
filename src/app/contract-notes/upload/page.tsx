'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

const BROKERS = [
  { key: '', label: '— Auto-detect —' },
  { key: 'aditya-birla', label: 'Aditya Birla Capital' },
  { key: 'angel-one', label: 'Angel One' },
  { key: 'zerodha', label: 'Zerodha' },
  { key: 'kotak', label: 'Kotak Securities' },
  { key: 'yes-securities', label: 'Yes Securities' },
  { key: 'icici', label: 'ICICI Direct' },
  { key: 'hdfc', label: 'HDFC Securities' },
  { key: 'motilal-oswal', label: 'Motilal Oswal' },
  { key: 'sharekhan', label: 'Sharekhan' },
  { key: '5paisa', label: '5Paisa' },
]

type UploadState = 'idle' | 'uploading' | 'password_required' | 'success' | 'error'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [broker, setBroker] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<UploadState>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [passwordHint, setPasswordHint] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setState('uploading')
    setError('')

    const fd = new FormData()
    fd.append('file', file)
    if (broker) fd.append('parserKey', broker)
    if (password) fd.append('password', password)

    try {
      const res = await fetch('/api/contract-notes', { method: 'POST', body: fd })
      const data = await res.json()

      if (data.error === 'PASSWORD_REQUIRED') {
        setState('password_required')
        setPasswordHint(getBrokerPasswordHint(broker))
        return
      }
      if (data.error === 'WRONG_PASSWORD') {
        setState('password_required')
        setError('Incorrect password. Try your PAN number (e.g. ABCDE1234F).')
        return
      }
      if (!res.ok || data.error) {
        setState('error')
        setError(data.message ?? data.error ?? 'Upload failed')
        return
      }

      setResult(data)
      setState('success')
    } catch (err) {
      setState('error')
      setError('Network error. Please try again.')
    }
  }

  function getBrokerPasswordHint(key: string): string {
    const hints: Record<string, string> = {
      'aditya-birla': 'PAN Number of the account holder (e.g. ABCDE1234F)',
      'angel-one': 'PAN Number (e.g. ABCDE1234F)',
      'zerodha': 'PAN Number (e.g. ABCDE1234F)',
      'kotak': 'Date of birth in DDMMYYYY or PAN Number',
      'yes-securities': 'PAN Number (e.g. ABCDE1234F)',
    }
    return hints[key] ?? 'PAN Number of the account holder'
  }

  const parsed = result?.parsed as Record<string, unknown> | undefined

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Upload Contract Note</h1>
          <p className="text-slate-500 text-sm mt-1">Upload a broker contract note PDF. Password-protected files are supported.</p>
        </div>

        {state !== 'success' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Contract Note PDF</label>
              <div
                className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div>
                    <p className="text-slate-900 font-medium">{file.name}</p>
                    <p className="text-slate-500 text-sm">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-500 text-sm">Click to select PDF or drag and drop</p>
                    <p className="text-slate-400 text-xs mt-1">Max 20 MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => { setFile(e.target.files?.[0] ?? null); setState('idle') }}
              />
            </div>

            {/* Broker Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Broker</label>
              <select
                value={broker}
                onChange={e => setBroker(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {BROKERS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
              </select>
              <p className="text-xs text-slate-400 mt-1">Leave as Auto-detect to let the system identify the broker from the PDF.</p>
            </div>

            {/* Password */}
            {(state === 'password_required' || password) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  PDF Password
                  {state === 'password_required' && (
                    <span className="ml-2 text-orange-600 font-normal">Required</span>
                  )}
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={e => setPassword(e.target.value.toUpperCase())}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
                {passwordHint && (
                  <p className="text-xs text-slate-500 mt-1">Hint: {passwordHint}</p>
                )}
              </div>
            )}

            {state === 'password_required' && !password && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-orange-800 text-sm font-medium">Password Required</p>
                <p className="text-orange-700 text-sm mt-1">{passwordHint || getBrokerPasswordHint(broker)}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!file || state === 'uploading'}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white py-3 rounded-lg font-medium transition-colors"
            >
              {state === 'uploading' ? 'Processing...' : 'Upload & Parse'}
            </button>
          </form>
        )}

        {/* Result */}
        {state === 'success' && parsed && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-800 font-semibold">Parsed successfully</p>
              <p className="text-green-700 text-sm mt-1">
                {String(parsed.brokerName)} — Contract Note {String(parsed.contractNoteNo)} — {String(parsed.tradeDate)}
              </p>
            </div>

            <div className="bg-white rounded-xl border p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Info label="Client" value={String(parsed.clientName || '—')} />
                <Info label="PAN" value={String(parsed.clientPan || '—')} />
                <Info label="Trades Extracted" value={String((parsed.trades as unknown[])?.length ?? 0)} />
                <Info label="Charge Blocks" value={String((parsed.charges as unknown[])?.length ?? 0)} />
              </div>

              {(parsed.parseWarnings as string[])?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-800 text-sm font-medium">Warnings</p>
                  {(parsed.parseWarnings as string[]).map((w, i) => (
                    <p key={i} className="text-yellow-700 text-xs mt-1">{w}</p>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    const res = await fetch('/api/contract-notes/generate-journal', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ contractNote: parsed }),
                    })
                    const data = await res.json()
                    alert(data.hasErrors
                      ? `Generated with errors:\n${data.errors.join('\n')}`
                      : `Generated ${data.entries?.length} journal entries. Tally XML ready.`)
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium"
                >
                  Generate Journal Entries
                </button>
                <button
                  onClick={() => { setFile(null); setPassword(''); setState('idle'); setResult(null) }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium"
                >
                  Upload Another
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value}</p>
    </div>
  )
}
