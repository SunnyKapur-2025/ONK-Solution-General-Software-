export type IndustryGroup =
  | 'service'
  | 'trading'
  | 'professional'
  | 'manufacturing'
  | 'finance'

export interface Industry {
  id: string
  label: string
  group: IndustryGroup
  defaultModules: ModuleKey[]
}

export type ModuleKey =
  | 'sales'
  | 'purchases'
  | 'expenses'
  | 'receipts'
  | 'payments'
  | 'income'
  | 'gst'
  | 'tds'
  | 'bank'
  | 'cash'
  | 'payroll'
  | 'attendance'
  | 'invoices'
  | 'debtors'
  | 'creditors'
  | 'aging'
  | 'pnl'
  | 'balance_sheet'
  | 'cash_flow'
  | 'depreciation'
  | 'loans'
  | 'stock'
  | 'assets'
  | 'dashboard'
  | 'reports'

export interface ModuleMeta {
  key: ModuleKey
  label: string
  description: string
  icon: string
}

export type UserRole = 'owner' | 'accountant' | 'manager' | 'staff' | 'superadmin'

export interface Tenant {
  id: string
  name: string
  slug: string
  industry_id: string
  gstin?: string
  pan?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  phone?: string
  email?: string
  logo_url?: string
  financial_year_start: number // month: 4 = April
  is_active: boolean
  subscription_plan: 'starter' | 'professional' | 'enterprise' | 'onetime'
  subscription_expires_at?: string
  created_at: string
}

export interface TenantUser {
  id: string
  tenant_id: string
  user_id: string
  role: UserRole
  name: string
  email: string
  is_active: boolean
  created_at: string
}

export interface TenantModule {
  id: string
  tenant_id: string
  module_key: ModuleKey
  is_enabled: boolean
  enabled_by?: string
  enabled_at?: string
}

export interface Account {
  id: string
  tenant_id: string
  code: string
  name: string
  type: AccountType
  sub_type: string
  parent_id?: string
  is_system: boolean
  is_active: boolean
  opening_balance: number
  opening_balance_type: 'dr' | 'cr'
}

export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'income'
  | 'expense'

export interface JournalEntry {
  id: string
  tenant_id: string
  entry_number: string
  entry_date: string
  narration: string
  reference?: string
  voucher_type: VoucherType
  status: 'draft' | 'posted' | 'cancelled'
  lines: JournalLine[]
  created_by: string
  created_at: string
}

export type VoucherType =
  | 'journal'
  | 'payment'
  | 'receipt'
  | 'sales'
  | 'purchase'
  | 'contra'
  | 'credit_note'
  | 'debit_note'

export interface JournalLine {
  id: string
  journal_entry_id: string
  account_id: string
  account?: Account
  debit: number
  credit: number
  narration?: string
  party_id?: string
  cost_centre?: string
}
