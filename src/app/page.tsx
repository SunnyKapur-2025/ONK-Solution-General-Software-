import Link from 'next/link'

const FEATURES = [
  {
    title: 'Smart Invoicing',
    description: 'Create GST-compliant invoices in seconds. Auto-numbered, tax-calculated, ready to send.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Real-Time Books',
    description: 'Double-entry accounting that runs in the background. P&L and Balance Sheet, live.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: 'GST & TDS Ready',
    description: 'GSTR-1, GSTR-3B, TDS 26AS reconciliation. Filings made painless.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Payroll Automation',
    description: 'PF, ESI, TDS calculated automatically. Generate payslips and journal entries in one click.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: 'Bank Reconciliation',
    description: 'Match transactions, spot mismatches, close your books faster than ever.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Tally & Busy Export',
    description: 'One-click export to Tally XML and Busy CSV. No more manual data entry.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
]

const STATS = [
  { value: '50+', label: 'Industries Supported' },
  { value: '19', label: 'Built-in Modules' },
  { value: 'Schedule III', label: 'Companies Act 2013' },
  { value: '24/7', label: 'Cloud-Hosted' },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-blue-50/30">
      {/* Nav */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">O</div>
            <span className="font-semibold text-slate-900 tracking-tight">ONK <span className="text-slate-500 font-normal">Solutions</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-600 font-medium">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <Link href="/auth/login" className="hover:text-slate-900 transition-colors">Sign In</Link>
          </nav>
          <Link
            href="/auth/signup"
            className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-blue-200/40 rounded-full blur-3xl" aria-hidden />
        <div className="absolute top-1/2 -right-20 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl" aria-hidden />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200 rounded-full px-4 py-1.5 text-xs font-medium text-slate-700 mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Built for Indian businesses — GST, TDS &amp; Schedule III ready
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.05] mb-6">
            Run your business
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              the smart way.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            One platform for accounting, GST, payroll, and reports — designed for Indian CAs, accountants, and small business owners. Inspired by QuickBooks, Zoho, and Tally.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/auth/signup"
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-7 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-slate-900/10 hover:shadow-xl hover:-translate-y-0.5"
            >
              Start free trial →
            </Link>
            <Link
              href="/auth/login"
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-300 font-medium px-7 py-3.5 rounded-xl text-sm transition-all shadow-sm"
            >
              Sign in to your account
            </Link>
          </div>

          <p className="text-xs text-slate-500 mt-6">No credit card required · Setup in under 2 minutes</p>

          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
              Everything you need.
              <br />
              <span className="text-slate-500 font-medium">Nothing you don&apos;t.</span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              A complete accounting and compliance suite — purpose-built for the Indian service industry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group bg-white rounded-2xl p-7 border border-slate-200/80 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/40 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="py-24 px-6 bg-gradient-to-br from-slate-50 to-blue-50/40">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 rounded-3xl p-12 md:p-16 text-center overflow-hidden shadow-2xl shadow-slate-900/20">
            <div className="absolute inset-0 opacity-10" aria-hidden>
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-500 rounded-full blur-3xl" />
            </div>

            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
                Ready to simplify your books?
              </h2>
              <p className="text-slate-300 mb-10 max-w-md mx-auto">
                Join Indian businesses already running ONK Solutions. Free to try, no setup fees.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/auth/signup"
                  className="bg-white hover:bg-slate-100 text-slate-900 font-medium px-7 py-3.5 rounded-xl text-sm transition-all shadow-lg hover:-translate-y-0.5"
                >
                  Create your free account →
                </Link>
                <Link
                  href="/auth/login"
                  className="bg-white/10 hover:bg-white/15 text-white border border-white/20 font-medium px-7 py-3.5 rounded-xl text-sm transition-all backdrop-blur"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">O</div>
            <span>© {new Date().getFullYear()} ONK Solutions. Made in India.</span>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <Link href="/auth/login" className="hover:text-slate-900 transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
