'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ModuleKey } from '@/types'
import { MODULES } from '@/lib/modules'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Company {
  id: string
  name: string
}

interface AppShellProps {
  tenantName: string
  tenantId: string
  userName: string
  userRole: string
  enabledModules: ModuleKey[]
  companies: Company[]
  children: React.ReactNode
}

// ---------------------------------------------------------------------------
// Route map
// ---------------------------------------------------------------------------

const MODULE_ROUTES: Record<ModuleKey, string> = {
  dashboard:     '/dashboard',
  sales:         '/sales',
  purchases:     '/purchases',
  expenses:      '/expenses',
  receipts:      '/receipts',
  payments:      '/payments',
  customers:     '/customers',
  vendors:       '/vendors',
  bank:          '/bank',
  gst:           '/gst',
  payroll:       '/payroll',
  attendance:    '/attendance',
  day_book:      '/day-book',
  pnl:           '/pnl',
  balance_sheet: '/balance-sheet',
  debtors:       '/debtors',
  creditors:     '/creditors',
  reports:       '/reports',
  settings:      '/settings',
}

// ---------------------------------------------------------------------------
// Navigation group definitions
// ---------------------------------------------------------------------------

interface NavGroup {
  label: string
  modules: ModuleKey[]
}

const NAV_GROUPS: NavGroup[] = [
  { label: 'Overview',    modules: ['dashboard'] },
  { label: 'Accounting',  modules: ['sales', 'purchases', 'expenses', 'receipts', 'payments'] },
  { label: 'Parties',     modules: ['customers', 'vendors'] },
  { label: 'Banking',     modules: ['bank'] },
  { label: 'Compliance',  modules: ['gst'] },
  { label: 'Payroll',     modules: ['payroll', 'attendance'] },
  { label: 'Books',       modules: ['day_book', 'pnl', 'balance_sheet', 'debtors', 'creditors', 'reports'] },
]

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function IconDashboard({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconSales({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
      <line x1="9" y1="9" x2="11" y2="9" />
    </svg>
  )
}

function IconPurchases({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function IconExpenses({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function IconReceipts({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  )
}

function IconPayments({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function IconCustomers({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconVendors({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function IconBank({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="22" x2="21" y2="22" />
      <line x1="6" y1="18" x2="6" y2="11" />
      <line x1="10" y1="18" x2="10" y2="11" />
      <line x1="14" y1="18" x2="14" y2="11" />
      <line x1="18" y1="18" x2="18" y2="11" />
      <polygon points="12 2 20 7 4 7" />
    </svg>
  )
}

function IconGst({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 13h6" />
      <path d="M9 17h3" />
      <path d="M11 9l-2 4h4l-2 4" />
    </svg>
  )
}

function IconPayroll({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  )
}

function IconAttendance({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <polyline points="9 16 11 18 15 14" />
    </svg>
  )
}

function IconDayBook({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  )
}

function IconPnl({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function IconBalanceSheet({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function IconDebtors({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function IconCreditors({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  )
}

function IconReports({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="8" y1="9" x2="10" y2="9" />
    </svg>
  )
}

function IconSettings({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function IconChevronDown({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconChevronLeft({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function IconChevronRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function IconMenu({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function IconX({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconSignOut({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function IconUser({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Module icon resolver
// ---------------------------------------------------------------------------

function ModuleIcon({ moduleKey, size = 18 }: { moduleKey: ModuleKey; size?: number }) {
  switch (moduleKey) {
    case 'dashboard':     return <IconDashboard size={size} />
    case 'sales':         return <IconSales size={size} />
    case 'purchases':     return <IconPurchases size={size} />
    case 'expenses':      return <IconExpenses size={size} />
    case 'receipts':      return <IconReceipts size={size} />
    case 'payments':      return <IconPayments size={size} />
    case 'customers':     return <IconCustomers size={size} />
    case 'vendors':       return <IconVendors size={size} />
    case 'bank':          return <IconBank size={size} />
    case 'gst':           return <IconGst size={size} />
    case 'payroll':       return <IconPayroll size={size} />
    case 'attendance':    return <IconAttendance size={size} />
    case 'day_book':      return <IconDayBook size={size} />
    case 'pnl':           return <IconPnl size={size} />
    case 'balance_sheet': return <IconBalanceSheet size={size} />
    case 'debtors':       return <IconDebtors size={size} />
    case 'creditors':     return <IconCreditors size={size} />
    case 'reports':       return <IconReports size={size} />
    case 'settings':      return <IconSettings size={size} />
    default:              return <IconReports size={size} />
  }
}

// ---------------------------------------------------------------------------
// Company Switcher
// ---------------------------------------------------------------------------

function CompanySwitcher({
  tenantName,
  companies,
  collapsed,
}: {
  tenantName: string
  companies: Company[]
  collapsed: boolean
}) {
  const [open, setOpen] = useState(false)

  if (collapsed) {
    return (
      <div className="flex items-center justify-center px-2 py-3 border-b border-slate-200">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold select-none">
          {tenantName.charAt(0).toUpperCase()}
        </div>
      </div>
    )
  }

  return (
    <div className="relative border-b border-slate-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold select-none">
          {tenantName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{tenantName}</p>
          <p className="text-xs text-slate-500">Company</p>
        </div>
        <span className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}>
          <IconChevronDown size={14} />
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-b-lg shadow-lg max-h-64 overflow-y-auto">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={async () => {
                if (c.name === tenantName) { setOpen(false); return }
                const res = await fetch('/api/companies/switch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tenantId: c.id }),
                })
                if (res.ok) window.location.assign('/dashboard')
                else setOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors ${
                c.name === tenantName ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
              }`}
            >
              <div className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-white text-xs font-bold bg-slate-400">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm truncate flex-1">{c.name}</span>
              {c.name === tenantName && (
                <span className="text-xs text-blue-600 font-medium">Active</span>
              )}
            </button>
          ))}
          <div className="border-t border-slate-100">
            <a
              href="/companies"
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <span className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center bg-slate-100 text-slate-500 text-xs">⚙</span>
              <span>Manage companies</span>
            </a>
            <a
              href="/companies/new"
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <span className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center bg-blue-50 text-blue-600 text-xs font-bold">+</span>
              <span>Add new company</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Nav Item
// ---------------------------------------------------------------------------

function NavItem({
  moduleKey,
  active,
  collapsed,
}: {
  moduleKey: ModuleKey
  active: boolean
  collapsed: boolean
}) {
  const meta = MODULES[moduleKey]
  const href = MODULE_ROUTES[moduleKey]

  return (
    <Link
      href={href}
      title={collapsed ? meta.label : undefined}
      className={`
        group flex items-center gap-3 rounded-lg transition-all duration-150 select-none
        ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'}
        ${
          active
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }
      `}
    >
      <span className={`flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
        <ModuleIcon moduleKey={moduleKey} size={18} />
      </span>
      {!collapsed && (
        <span className="text-sm font-medium truncate">{meta.label}</span>
      )}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Sidebar content
// ---------------------------------------------------------------------------

function SidebarContent({
  enabledModules,
  pathname,
  collapsed,
  tenantName,
  companies,
  userName,
  userRole,
  onSignOut,
}: {
  enabledModules: ModuleKey[]
  pathname: string
  collapsed: boolean
  tenantName: string
  companies: Company[]
  userName: string
  userRole: string
  onSignOut: () => void
}) {
  const enabledSet = new Set(enabledModules)

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Company switcher */}
      <CompanySwitcher tenantName={tenantName} companies={companies} collapsed={collapsed} />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_GROUPS.map((group) => {
          const visibleModules = group.modules.filter((m) => enabledSet.has(m))
          if (visibleModules.length === 0) return null

          return (
            <div key={group.label} className="mb-4">
              {!collapsed ? (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>
              ) : (
                <div className="my-1 mx-1 border-t border-slate-100" />
              )}
              <div className="space-y-0.5">
                {visibleModules.map((moduleKey) => {
                  const route = MODULE_ROUTES[moduleKey]
                  const isActive =
                    pathname === route || pathname.startsWith(route + '/')
                  return (
                    <NavItem
                      key={moduleKey}
                      moduleKey={moduleKey}
                      active={isActive}
                      collapsed={collapsed}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 px-2 py-3 space-y-0.5">
        {/* Settings always visible */}
        <NavItem
          moduleKey="settings"
          active={pathname === '/settings' || pathname.startsWith('/settings/')}
          collapsed={collapsed}
        />

        {/* User info + sign out */}
        {!collapsed ? (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500">
              <IconUser size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 truncate">{userName}</p>
              <p className="text-[10px] text-slate-400 capitalize truncate">{userRole}</p>
            </div>
            <button
              onClick={onSignOut}
              title="Sign out"
              className="flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors p-1 rounded"
            >
              <IconSignOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={onSignOut}
            title="Sign out"
            className="w-full flex items-center justify-center px-2 py-2.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <IconSignOut size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------

export default function AppShell({
  tenantName,
  tenantId: _tenantId,
  userName,
  userRole,
  enabledModules,
  companies,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = useCallback(async () => {
    router.push('/auth/login')
  }, [router])

  const sidebarWidth = desktopCollapsed ? 'w-16' : 'w-60'

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — mobile (slide-in drawer) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-60 border-r border-slate-200 shadow-xl
          transform transition-transform duration-300 ease-in-out
          lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Close sidebar"
          >
            <IconX size={18} />
          </button>
        </div>
        <SidebarContent
          enabledModules={enabledModules}
          pathname={pathname}
          collapsed={false}
          tenantName={tenantName}
          companies={companies}
          userName={userName}
          userRole={userRole}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Sidebar — desktop (collapsible) */}
      <aside
        className={`
          hidden lg:block relative flex-shrink-0
          border-r border-slate-200 bg-white
          transition-all duration-300 ease-in-out
          ${sidebarWidth}
        `}
      >
        {/* Collapse/expand toggle button */}
        <button
          onClick={() => setDesktopCollapsed((v) => !v)}
          className={`
            absolute -right-3 top-14 z-10
            w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm
            flex items-center justify-center
            text-slate-500 hover:text-blue-600 hover:border-blue-300
            transition-colors
          `}
          aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {desktopCollapsed ? <IconChevronRight size={12} /> : <IconChevronLeft size={12} />}
        </button>

        <div className="h-full">
          <SidebarContent
            enabledModules={enabledModules}
            pathname={pathname}
            collapsed={desktopCollapsed}
            tenantName={tenantName}
            companies={companies}
            userName={userName}
            userRole={userRole}
            onSignOut={handleSignOut}
          />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar with hamburger */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-slate-200 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Open sidebar"
          >
            <IconMenu size={20} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
              {tenantName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-slate-800 truncate">{tenantName}</span>
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
