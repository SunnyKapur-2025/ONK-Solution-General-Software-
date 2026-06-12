import Link from 'next/link'

export default function HoldingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Holdings</h1>
          <p className="text-slate-500 text-sm mt-1">Current portfolio — equity, F&O, currency positions.</p>
        </div>

        <div className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3">
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option>All Exchanges</option>
            <option>NSE</option>
            <option>BSE</option>
            <option>MCX</option>
          </select>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option>All Brokers</option>
          </select>
          <input type="date" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="As of date" />
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['Security', 'Exchange', 'Qty', 'Avg Cost', 'Total Cost', 'Broker', 'Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-600 font-medium text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  No holdings found. Upload contract notes to populate holdings.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
