import Link from 'next/link'

export default function PLPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Profit & Loss</h1>
          <p className="text-slate-500 text-sm mt-1">Realized P&L from all contract notes, segregated by tax category.</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3">
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option>FY 2025-26</option>
            <option>FY 2024-25</option>
            <option>FY 2023-24</option>
          </select>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option>All Brokers</option>
          </select>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option>All Categories</option>
            <option>STCG (Equity)</option>
            <option>LTCG (Equity)</option>
            <option>Speculative (Intraday)</option>
            <option>F&O (Business Income)</option>
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Short Term Capital Gain', value: '₹—', sub: '< 1 year, taxed @15%', color: 'blue' },
            { label: 'Long Term Capital Gain', value: '₹—', sub: '> 1 year, taxed @10%', color: 'green' },
            { label: 'Speculative (Intraday)', value: '₹—', sub: 'Taxed as income', color: 'purple' },
            { label: 'F&O (Business Income)', value: '₹—', sub: 'Business income/loss', color: 'orange' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-500 font-medium">{c.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{c.value}</p>
              <p className="text-xs text-slate-400 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border p-12 text-center text-slate-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">No trades yet</p>
          <p className="text-sm mt-1">Upload contract notes to see your P&L breakdown</p>
        </div>
      </div>
    </div>
  )
}
