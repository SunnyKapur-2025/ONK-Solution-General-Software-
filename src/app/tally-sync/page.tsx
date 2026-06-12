'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function TallySyncPage() {
  const [connection, setConnection] = useState<{ connected?: boolean; error?: string } | null>(null)
  const [checking, setChecking] = useState(false)

  async function checkConnection() {
    setChecking(true)
    try {
      const res = await fetch('/api/tally-sync')
      const data = await res.json()
      setConnection(data)
    } catch {
      setConnection({ connected: false, error: 'Failed to reach API' })
    }
    setChecking(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Tally Integration</h1>
          <p className="text-slate-500 text-sm mt-1">Export journal entries to TallyPrime via XML file or live sync.</p>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Live Sync Status</h2>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${connection?.connected ? 'bg-green-500' : connection === null ? 'bg-slate-300' : 'bg-red-400'}`} />
            <span className="text-sm text-slate-700">
              {connection === null ? 'Not checked'
                : connection.connected ? 'TallyPrime is connected and running'
                : `Not connected — ${connection.error}`}
            </span>
            <button
              onClick={checkConnection}
              disabled={checking}
              className="ml-auto text-sm text-blue-600 hover:underline disabled:opacity-50"
            >
              {checking ? 'Checking...' : 'Check Connection'}
            </button>
          </div>

          <div className="mt-4 bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-1">
            <p className="font-medium text-slate-700">How to enable Tally HTTP Server:</p>
            <p>1. Open TallyPrime → Gateway of Tally</p>
            <p>2. Press F12 → Advanced Configuration</p>
            <p>3. Client/Server Configuration → Enable Tally.ERP 9 Server</p>
            <p>4. Set port to <code className="bg-white px-1 rounded border">9000</code> (default)</p>
            <p>5. The server host/port can be changed in your <code className="bg-white px-1 rounded border">.env.local</code></p>
          </div>
        </div>

        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-slate-900 mb-2">XML File Export</h3>
            <p className="text-sm text-slate-500 mb-4">Download a .xml file and import it manually into TallyPrime via Gateway → Import Data → Vouchers.</p>
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium">
              Download XML
            </button>
          </div>
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-slate-900 mb-2">Live Push</h3>
            <p className="text-sm text-slate-500 mb-4">Push journal entries directly to a running TallyPrime instance on the same network.</p>
            <button
              disabled={!connection?.connected}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2 rounded-lg text-sm font-medium"
            >
              Push to Tally
            </button>
            {!connection?.connected && (
              <p className="text-xs text-slate-400 mt-2 text-center">Connect to TallyPrime first</p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mt-6">
          <h3 className="font-semibold text-amber-900 mb-2">Before Exporting</h3>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>Ensure ledger names in entries match your Tally company exactly</li>
            <li>Import ledger masters XML first, then vouchers XML</li>
            <li>Always review journal entries before pushing to Tally</li>
            <li>Entries marked with errors must be corrected before export</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
