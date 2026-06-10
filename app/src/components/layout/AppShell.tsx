'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ModuleKey } from '@/types'
import { MODULES } from '@/lib/modules'

const NAV_ICONS: Record<string, string> = {
  dashboard:     '⬜',
  sales:         '🧾',
  purchases:     '📦',
  expenses:      '💸',
  income:        '📈',
  receipts:      '💰',
  payments:      '🏧',
  gst:           '📋',
  tds:           '%',
  bank:          '🏦',
  cash:          '💵',
  payroll:       '👥',
  attendance:    '📅',
  invoices:      '📄',
  debtors:       '⬇',
  creditors:     '⬆',
  aging:         '🕐',
  pnl:           '📊',
  balance_sheet: '📖',
  cash_flow:     '🌊',
  depreciation:  '📉',
  loans:         '💳',
  stock:         '📦',
  assets:        '🏢',
  reports:       '🥧',
}

const MODULE_ROUTES: Partial<Record<ModuleKey, string>> = {
  dashboard:     '/dashboard',
  sales:         '/sales',
  purchases:     '/purchases',
  expenses:      '/expenses',
  income:        '/income',
  gst:           '/gst',
  tds:           '/tds',
  bank:          '/bank',
  cash:          '/cash',
  payroll:       '/payroll',
  attendance:    '/attendance',
  invoices:      '/invoices',
  debtors:       '/debtors',
  creditors:     '/creditors',
  aging:         '/aging',
  pnl:           '/pnl',
  balance_sheet: '/balance-sheet',
  cash_flow:     '/cash-flow',
  depreciation:  '/depreciation',
  loans:         '/loans',
  stock:         '/stock',
  assets:        '/assets',
  reports:       '/reports',
}

interface Props {
  tenantName: string
  userName: string
  userRole: string
  enabledModules: ModuleKey[]
  children: React.ReactNode
}

export default function AppShell({ tenantName, userName, userRole, enabledModules, children }: Props) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-slate-900 flex flex-col flex-shrink-0 overflow-y-auto">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-800">
          <p className="text-white font-bold text-base">
            <span className="text-blue-400">ONK</span> Solutions
          </p>
          <p className="text-slate-400 text-xs mt-0.5 truncate">{tenantName}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5">
          {enabledModules.map((key) => {
            const mod = MODULES[key]
            const route = MODULE_ROUTES[key]
            if (!route) return null
            const isActive = pathname === route || pathname.startsWith(route + '/')
            return (
              <Link
                key={key}
                href={route}
                className={`flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="text-base leading-none w-5 text-center">{NAV_ICONS[key] || '•'}</span>
                <span>{mod.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-3 border-t border-slate-800">
          <p className="text-slate-300 text-xs font-medium truncate">{userName}</p>
          <p className="text-slate-500 text-xs capitalize">{userRole}</p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <Link
              href="/export"
              className="text-xs text-slate-600 hover:text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg"
            >
              Export to Tally / Busy
            </Link>
            <form action="/auth/signout" method="post">
              <button className="text-xs text-slate-500 hover:text-red-600 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
