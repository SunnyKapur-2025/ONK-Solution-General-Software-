import { ModuleKey, ModuleMeta } from '@/types'

export const MODULES: Record<ModuleKey, ModuleMeta> = {
  dashboard:     { key: 'dashboard',     label: 'Dashboard',        description: 'Business overview and KPIs',               icon: 'dashboard' },
  sales:         { key: 'sales',         label: 'Sales Invoices',   description: 'Create and manage sales invoices',          icon: 'sales' },
  purchases:     { key: 'purchases',     label: 'Purchase Bills',   description: 'Record bills from suppliers',               icon: 'purchases' },
  expenses:      { key: 'expenses',      label: 'Expenses',         description: 'Business expense tracking',                 icon: 'expenses' },
  receipts:      { key: 'receipts',      label: 'Receipts',         description: 'Money received from customers',             icon: 'receipts' },
  payments:      { key: 'payments',      label: 'Payments',         description: 'Money paid to vendors',                     icon: 'payments' },
  customers:     { key: 'customers',     label: 'Customers',        description: 'Customer directory and ledger',             icon: 'customers' },
  vendors:       { key: 'vendors',       label: 'Vendors',          description: 'Vendor directory and ledger',               icon: 'vendors' },
  bank:          { key: 'bank',          label: 'Bank',             description: 'Bank accounts and reconciliation',          icon: 'bank' },
  gst:           { key: 'gst',           label: 'GST Returns',      description: 'GST filing and reconciliation',             icon: 'gst' },
  payroll:       { key: 'payroll',       label: 'Payroll',          description: 'Salary processing and payslips',            icon: 'payroll' },
  attendance:    { key: 'attendance',    label: 'Attendance',       description: 'Staff attendance and leave',                icon: 'attendance' },
  day_book:      { key: 'day_book',      label: 'Day Book',         description: 'Chronological journal register',            icon: 'day_book' },
  pnl:           { key: 'pnl',           label: 'P&L Statement',    description: 'Profit & Loss report',                      icon: 'pnl' },
  balance_sheet: { key: 'balance_sheet', label: 'Balance Sheet',    description: 'Balance sheet as per Schedule III',         icon: 'balance_sheet' },
  debtors:       { key: 'debtors',       label: 'Debtors Aging',    description: 'Outstanding receivables by age',            icon: 'debtors' },
  creditors:     { key: 'creditors',     label: 'Creditors Aging',  description: 'Outstanding payables by age',               icon: 'creditors' },
  reports:       { key: 'reports',       label: 'Reports',          description: 'All financial reports and exports',         icon: 'reports' },
  settings:      { key: 'settings',      label: 'Settings',         description: 'Company profile and preferences',           icon: 'settings' },
}

export const ALL_MODULE_KEYS = Object.keys(MODULES) as ModuleKey[]

export const CORE_MODULES: ModuleKey[] = [
  'dashboard', 'sales', 'purchases', 'expenses', 'receipts', 'payments',
  'customers', 'vendors', 'bank', 'gst', 'payroll', 'attendance',
  'day_book', 'pnl', 'balance_sheet', 'debtors', 'creditors', 'reports', 'settings'
]
