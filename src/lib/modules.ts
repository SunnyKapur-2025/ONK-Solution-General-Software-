import { ModuleKey, ModuleMeta } from '@/types'

export const MODULES: Record<ModuleKey, ModuleMeta> = {
  sales:         { key: 'sales',         label: 'Sales',            description: 'Sales invoices and receipts',              icon: 'ShoppingCart' },
  purchases:     { key: 'purchases',     label: 'Purchases',        description: 'Purchase bills and payments',               icon: 'Package' },
  expenses:      { key: 'expenses',      label: 'Expenses',         description: 'Business expense tracking',                 icon: 'Receipt' },
  income:        { key: 'income',        label: 'Income',           description: 'Other income entries',                     icon: 'TrendingUp' },
  gst:           { key: 'gst',           label: 'GST',              description: 'GST filing and reconciliation',             icon: 'FileText' },
  tds:           { key: 'tds',           label: 'TDS',              description: 'TDS deduction and 26AS reconciliation',     icon: 'Percent' },
  bank:          { key: 'bank',          label: 'Bank',             description: 'Bank accounts and reconciliation',          icon: 'Landmark' },
  cash:          { key: 'cash',          label: 'Cash',             description: 'Cash management and petty cash',            icon: 'Wallet' },
  payroll:       { key: 'payroll',       label: 'Payroll',          description: 'Salary processing and payslips',            icon: 'Users' },
  attendance:    { key: 'attendance',    label: 'Attendance',       description: 'Staff attendance and leave management',     icon: 'CalendarCheck' },
  invoices:      { key: 'invoices',      label: 'Invoices',         description: 'Client invoice generation',                 icon: 'FileInvoice' },
  debtors:       { key: 'debtors',       label: 'Debtors',          description: 'Outstanding receivables management',        icon: 'ArrowDownCircle' },
  creditors:     { key: 'creditors',     label: 'Creditors',        description: 'Outstanding payables management',           icon: 'ArrowUpCircle' },
  aging:         { key: 'aging',         label: 'Aging Summary',    description: 'Debtor and creditor aging analysis',        icon: 'Clock' },
  pnl:           { key: 'pnl',           label: 'P&L',              description: 'Profit & Loss statement',                   icon: 'BarChart2' },
  balance_sheet: { key: 'balance_sheet', label: 'Balance Sheet',    description: 'Balance sheet as per Schedule III',         icon: 'BookOpen' },
  cash_flow:     { key: 'cash_flow',     label: 'Cash Flow',        description: 'Cash flow statement',                      icon: 'Activity' },
  depreciation:  { key: 'depreciation',  label: 'Depreciation',     description: 'Asset depreciation schedules',              icon: 'TrendingDown' },
  loans:         { key: 'loans',         label: 'Loans',            description: 'Loans and advances management',             icon: 'CreditCard' },
  stock:         { key: 'stock',         label: 'Stock',            description: 'Inventory and stock management',            icon: 'Boxes' },
  assets:        { key: 'assets',        label: 'Fixed Assets',     description: 'Fixed assets register',                    icon: 'Building2' },
  dashboard:     { key: 'dashboard',     label: 'Dashboard',        description: 'Management overview dashboard',             icon: 'LayoutDashboard' },
  reports:       { key: 'reports',       label: 'Reports',          description: 'Financial and operational reports',         icon: 'PieChart' },
}

export const ALL_MODULE_KEYS = Object.keys(MODULES) as ModuleKey[]
