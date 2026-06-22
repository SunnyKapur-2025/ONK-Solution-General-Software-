'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
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

// Grouped nav — order within each group follows business workflow
const NAV_GROUPS: { label: string; keys: ModuleKey[] }[] = [
  { label: 'Overview',     keys: ['dashboard'] },
  { label: 'Transactions', keys: ['sales', 'purchases', 'expenses', 'income', 'invoices'] },
  { label: 'Parties',      keys: ['debtors', 'creditors', 'aging'] },
  { label: 'Banking',      keys: ['bank', 'cash', 'loans'] },
  { label: 'Compliance',   keys: ['gst', 'tds'] },
  { label: 'Payroll',      keys: ['payroll', 'attendance'] },
  { label: 'Assets',       keys: ['assets', 'depreciation', 'stock'] },
  { label: 'Reports',      keys: ['pnl', 'balance_sheet', 'cash_flow', 'reports'] },
]

interface Props {
  tenantName: string
  userName: string
  userRole: string
  enabledModules: ModuleKey[]
  children: React.ReactNode
}

export default function AppShell({ tenantName, userName, userRole, enabledModules, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [powerMode, setPowerMode] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Build ordered flat list of enabled module routes for Alt+1…9 navigation
  const navRoutes: string[] = NAV_GROUPS.flatMap(g =>
    g.keys
      .filter(k => enabledModules.includes(k))
      .map(k => MODULE_ROUTES[k])
      .filter(Boolean) as string[]
  )

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }, [router])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ctrl+M — toggle power mode
      if (e.ctrlKey && e.key === 'm') { e.preventDefault(); setPowerMode(p => !p) }
      // Ctrl+N — new voucher
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); router.push('/voucher') }
      // Ctrl+\ — toggle sidebar
      if (e.ctrlKey && e.key === '\\') { e.preventDefault(); setCollapsed(p => !p) }
      // Alt+1…9 — jump to nth tab
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const idx = parseInt(e.key) - 1
        if (!isNaN(idx) && idx >= 0 && idx < navRoutes.length) {
          e.preventDefault()
          router.push(navRoutes[idx])
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router, navRoutes])

  const isPowerMode = powerMode || pathname === '/voucher'

  return (
    <div className={`flex h-screen overflow-hidden ${isPowerMode ? 'bg-slate-900' : 'bg-slate-50'}`}>

      {/* ── Sidebar ── */}
      <aside
        className={`bg-slate-900 flex flex-col flex-shrink-0 overflow-y-auto transition-all duration-200 ${
          collapsed ? 'w-14' : 'w-56'
        }`}
      >
        {/* Logo + collapse toggle */}
        <div className="px-3 py-4 border-b border-slate-800 flex items-center gap-2 min-h-[57px]">
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base leading-tight">
                <span className="text-blue-400">ONK</span> Solutions
              </p>
              <p className="text-slate-400 text-xs mt-0.5 truncate">{tenantName}</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(p => !p)}
            title={collapsed ? 'Expand sidebar (Ctrl+\\)' : 'Collapse sidebar (Ctrl+\\)'}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        {/* Power Mode quick entry */}
        <div className={`pt-3 ${collapsed ? 'px-1' : 'px-3'}`}>
          <Link href="/voucher"
            title="Power Entry (Ctrl+N)"
            className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
              collapsed ? 'justify-center px-0 py-2' : 'gap-2 px-3 py-2'
            } ${
              pathname === '/voucher'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-green-400 border border-slate-700'
            }`}>
            <span>⌨</span>
            {!collapsed && <><span>Power Entry</span><span className="ml-auto text-[10px] text-slate-500 font-mono">^N</span></>}
          </Link>
        </div>

        {/* Grouped Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_GROUPS.map(group => {
            const groupItems = group.keys
              .filter(k => enabledModules.includes(k) && MODULE_ROUTES[k])
              .map(k => ({ key: k, route: MODULE_ROUTES[k]!, mod: MODULES[k] }))
            if (groupItems.length === 0) return null

            return (
              <div key={group.label} className="mb-1">
                {!collapsed && (
                  <p className="px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600 select-none">
                    {group.label}
                  </p>
                )}
                {collapsed && <div className="mx-3 my-1 border-t border-slate-800" />}
                {groupItems.map(({ key, route, mod }) => {
                  const isActive = pathname === route || pathname.startsWith(route + '/')
                  const tabIndex = navRoutes.indexOf(route) + 1
                  return (
                    <Link
                      key={key}
                      href={route}
                      title={collapsed ? `${mod.label}${tabIndex > 0 && tabIndex <= 9 ? ` (Alt+${tabIndex})` : ''}` : undefined}
                      className={`flex items-center gap-2.5 mx-2 rounded-lg text-sm transition-colors ${
                        collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'
                      } ${
                        isActive
                          ? 'bg-blue-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-base leading-none w-5 text-center flex-shrink-0">{NAV_ICONS[key] || '•'}</span>
                      {!collapsed && (
                        <span className="flex-1 truncate">{mod.label}</span>
                      )}
                      {!collapsed && tabIndex > 0 && tabIndex <= 9 && (
                        <span className="text-[10px] text-slate-600 font-mono ml-auto">⌥{tabIndex}</span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )
          })}

          {/* Day Book — always visible */}
          <div className={!collapsed ? 'mt-1' : ''}>
            {!collapsed && <p className="px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600 select-none">Books</p>}
            <Link href="/day-book"
              title={collapsed ? 'Day Book' : undefined}
              className={`flex items-center gap-2.5 mx-2 rounded-lg text-sm transition-colors ${
                collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'
              } ${
                pathname === '/day-book'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              <span className="text-base leading-none w-5 text-center">📒</span>
              {!collapsed && <span>Day Book</span>}
            </Link>
          </div>

          {/* Utility links */}
          <div className={collapsed ? 'mt-1' : ''}>
            {!collapsed && <div className="mx-4 my-2 border-t border-slate-800" />}
            {collapsed && <div className="mx-3 my-1 border-t border-slate-800" />}
            {[
              { href: '/ledger-create', icon: '📝', label: 'Ledger Creation' },
              { href: '/settings',      icon: '⚙️',  label: 'Settings' },
              { href: '/users',         icon: '👤',  label: 'Users & Rights' },
              ...(userRole === 'owner' || userRole === 'superadmin'
                ? [{ href: '/admin', icon: '🏢', label: 'Client Accounts' }]
                : []),
              { href: '/help',          icon: '❓',  label: 'Help & Support' },
            ].map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-2.5 mx-2 rounded-lg text-sm transition-colors ${
                  collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'
                } ${
                  pathname === href
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="text-base leading-none w-5 text-center">{icon}</span>
                {!collapsed && <span>{label}</span>}
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer: power mode + user + sign out */}
        <div className={`border-t border-slate-800 space-y-2 ${collapsed ? 'px-1 py-3' : 'px-4 py-3'}`}>
          <button
            onClick={() => setPowerMode(p => !p)}
            title={collapsed ? 'Toggle Power Mode (Ctrl+M)' : undefined}
            className={`w-full text-xs rounded-lg border font-mono transition-colors ${
              collapsed ? 'px-0 py-1.5 flex items-center justify-center' : 'px-3 py-1.5'
            } ${
              powerMode
                ? 'bg-green-900 border-green-700 text-green-400'
                : 'border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
          >
            {collapsed ? '⌨' : (powerMode ? '⌨ Power Mode ON' : '⌨ Power Mode (^M)')}
          </button>

          {!collapsed && (
            <>
              <p className="text-slate-300 text-xs font-medium truncate">{userName}</p>
              <p className="text-slate-500 text-xs capitalize">{userRole}</p>
              <p className="text-slate-700 text-[10px] mt-1">by Sunny Kapoor</p>
            </>
          )}

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            title="Sign out"
            className={`w-full text-xs rounded-lg border border-slate-700 transition-colors text-slate-500 hover:text-red-400 hover:border-red-800 ${
              collapsed ? 'px-0 py-1.5 flex items-center justify-center' : 'px-3 py-1.5'
            }`}
          >
            {collapsed ? '⏻' : (signingOut ? 'Signing out…' : '⏻  Sign out')}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar — hidden in power mode */}
        {!isPowerMode && (
          <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
            <div className="text-xs text-slate-400 font-mono hidden sm:block">
              Alt+1…9 jump tabs · Ctrl+\\ sidebar · Ctrl+N new voucher
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/export"
                className="text-xs text-slate-600 hover:text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg"
              >
                Export to Tally / Busy
              </Link>
            </div>
          </header>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
