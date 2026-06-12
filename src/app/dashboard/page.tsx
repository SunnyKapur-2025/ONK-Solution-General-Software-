import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">ONK Solutions</h1>
          <p className="text-xs text-slate-500">Contract Notes & Tally Integration</p>
        </div>
        <nav className="flex gap-6 text-sm text-slate-600">
          <Link href="/contract-notes" className="hover:text-blue-600">Contract Notes</Link>
          <Link href="/holdings" className="hover:text-blue-600">Holdings</Link>
          <Link href="/pnl" className="hover:text-blue-600">P&L</Link>
          <Link href="/tally-sync" className="hover:text-blue-600">Tally Sync</Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Contract Notes" value="—" sub="this month" color="blue" />
          <StatCard label="Total Trades" value="—" sub="parsed" color="indigo" />
          <StatCard label="Realized P&L" value="₹—" sub="this year" color="green" />
          <StatCard label="Tally Pending" value="—" sub="entries to export" color="orange" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QuickAction
            href="/contract-notes/upload"
            title="Upload Contract Note"
            description="Upload a PDF from any broker. System will auto-detect broker and extract trades."
            icon="📄"
          />
          <QuickAction
            href="/tally-sync"
            title="Export to Tally"
            description="Export pending journal entries to TallyPrime — XML file or live sync."
            icon="📊"
          />
          <QuickAction
            href="/holdings"
            title="View Holdings"
            description="Current portfolio with broker-wise and date-wise filters."
            icon="📈"
          />
          <QuickAction
            href="/pnl"
            title="P&L Report"
            description="Realized profit & loss with STCG / LTCG / Speculative / F&O breakdown."
            icon="💰"
          />
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  }
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-xs opacity-60 mt-1">{sub}</p>
    </div>
  )
}

function QuickAction({ href, title, description, icon }: { href: string; title: string; description: string; icon: string }) {
  return (
    <Link href={href} className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow block">
      <div className="flex items-start gap-4">
        <span className="text-3xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  )
}
