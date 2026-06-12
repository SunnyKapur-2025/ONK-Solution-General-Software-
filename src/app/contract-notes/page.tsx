import Link from 'next/link'

export default function ContractNotesPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/dashboard" className="text-blue-600 text-sm hover:underline">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">Contract Notes</h1>
          </div>
          <Link
            href="/contract-notes/upload"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Upload New
          </Link>
        </div>

        <div className="bg-white rounded-xl border">
          <div className="p-6 border-b flex gap-4 flex-wrap">
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option>All Brokers</option>
              <option>Aditya Birla Capital</option>
              <option>Angel One</option>
            </select>
            <input type="date" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input type="date" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option>All Segments</option>
              <option>Equity (CM)</option>
              <option>F&O</option>
              <option>Currency (CDS)</option>
              <option>Commodity</option>
            </select>
          </div>
          <div className="p-12 text-center text-slate-400">
            <p className="text-4xl mb-3">📄</p>
            <p className="font-medium">No contract notes yet</p>
            <p className="text-sm mt-1">Upload your first broker contract note to get started</p>
            <Link
              href="/contract-notes/upload"
              className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-500"
            >
              Upload Contract Note
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
