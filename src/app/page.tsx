import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white">ONK Solutions</h1>
          <p className="text-blue-300 mt-2 text-lg">Contract Notes & Tally Integration System</p>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-left space-y-4">
          <h2 className="text-white font-semibold text-xl">What this does</h2>
          <ul className="text-slate-300 space-y-2 text-sm">
            <li>Upload password-protected broker contract notes (PDF)</li>
            <li>Auto-extract trades — Equity, F&O, Currency, Commodity</li>
            <li>Generate correct double-entry journal entries</li>
            <li>Export to TallyPrime (XML file or live sync)</li>
            <li>Track holdings and realized P&L with filters</li>
          </ul>
        </div>
        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
          >
            Open Dashboard
          </Link>
          <Link
            href="/contract-notes/upload"
            className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-semibold transition-colors border border-white/20"
          >
            Upload Contract Note
          </Link>
        </div>
        <p className="text-slate-500 text-xs">
          Designed & Developed by Sunny Kapoor, ONK Solutions |{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>{' '}|{' '}
          <Link href="/disclaimer" className="underline">Disclaimer</Link>
        </p>
      </div>
    </main>
  )
}
