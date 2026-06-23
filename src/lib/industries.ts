import { Industry, ModuleKey } from '@/types'

export const INDUSTRIES: Industry[] = [
  // ── Group A: Service Industry ──────────────────────────────────
  {
    id: 'bpo',
    label: 'BPO / Call Centre',
    group: 'service',
    defaultModules: ['sales', 'expenses', 'gst', 'payroll', 'debtors', 'creditors', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'manpower',
    label: 'Manpower / Staffing Agency',
    group: 'service',
    defaultModules: ['sales', 'expenses', 'gst', 'attendance', 'payroll', 'invoices', 'debtors', 'creditors', 'aging', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'security',
    label: 'Security Agency',
    group: 'service',
    defaultModules: ['sales', 'expenses', 'gst', 'attendance', 'payroll', 'invoices', 'debtors', 'creditors', 'aging', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'housekeeping',
    label: 'Housekeeping / Facility Management',
    group: 'service',
    defaultModules: ['sales', 'expenses', 'gst', 'attendance', 'payroll', 'invoices', 'debtors', 'creditors', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'freight',
    label: 'Freight & Forwarding',
    group: 'service',
    defaultModules: ['sales', 'expenses', 'gst', 'bank', 'debtors', 'creditors', 'aging', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'courier',
    label: 'Courier & Logistics',
    group: 'service',
    defaultModules: ['sales', 'expenses', 'gst', 'debtors', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'event',
    label: 'Event Management',
    group: 'service',
    defaultModules: ['sales', 'expenses', 'gst', 'debtors', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'advertising',
    label: 'Advertising & PR Agency',
    group: 'service',
    defaultModules: ['sales', 'expenses', 'gst', 'debtors', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'consulting',
    label: 'Consulting / Advisory Firm',
    group: 'service',
    defaultModules: ['sales', 'expenses', 'gst', 'debtors', 'pnl', 'balance_sheet', 'dashboard', 'reports'],
  },
  {
    id: 'it_services',
    label: 'IT Services & Software Company',
    group: 'service',
    defaultModules: ['sales', 'expenses', 'gst', 'debtors', 'pnl', 'balance_sheet', 'dashboard', 'reports'],
  },

  // ── Group B: Trading ───────────────────────────────────────────
  {
    id: 'general_trading',
    label: 'General Trading',
    group: 'trading',
    defaultModules: ['sales', 'expenses', 'gst', 'debtors', 'creditors', 'aging', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'import_export',
    label: 'Import / Export',
    group: 'trading',
    defaultModules: ['sales', 'expenses', 'gst', 'bank', 'debtors', 'creditors', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'wholesale',
    label: 'Wholesale Distribution',
    group: 'trading',
    defaultModules: ['sales', 'gst', 'debtors', 'creditors', 'aging', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'retail',
    label: 'Retail Shop',
    group: 'trading',
    defaultModules: ['sales', 'gst', 'pnl', 'dashboard', 'reports'],
  },

  // ── Group C: Professional Services ────────────────────────────
  {
    id: 'ca_firm',
    label: 'CA / CS / Tax Firm',
    group: 'professional',
    defaultModules: ['sales', 'expenses', 'gst', 'debtors', 'pnl', 'balance_sheet', 'dashboard', 'reports'],
  },
  {
    id: 'legal',
    label: 'Legal Firm',
    group: 'professional',
    defaultModules: ['sales', 'expenses', 'debtors', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'healthcare',
    label: 'Healthcare / Clinic',
    group: 'professional',
    defaultModules: ['sales', 'expenses', 'gst', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'education',
    label: 'Education / Coaching',
    group: 'professional',
    defaultModules: ['sales', 'expenses', 'gst', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'real_estate',
    label: 'Real Estate / Builder',
    group: 'professional',
    defaultModules: ['sales', 'gst', 'debtors', 'creditors', 'pnl', 'balance_sheet', 'dashboard', 'reports'],
  },
  {
    id: 'hospitality',
    label: 'Hotel / Restaurant',
    group: 'professional',
    defaultModules: ['sales', 'gst', 'payroll', 'pnl', 'dashboard', 'reports'],
  },

  // ── Group D: Manufacturing & Construction ─────────────────────
  {
    id: 'manufacturing',
    label: 'Small Manufacturer',
    group: 'manufacturing',
    defaultModules: ['sales', 'gst', 'debtors', 'creditors', 'pnl', 'balance_sheet', 'dashboard', 'reports'],
  },
  {
    id: 'contractor',
    label: 'Civil Contractor',
    group: 'manufacturing',
    defaultModules: ['sales', 'gst', 'debtors', 'creditors', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'interior',
    label: 'Interior Designer',
    group: 'manufacturing',
    defaultModules: ['sales', 'gst', 'debtors', 'pnl', 'dashboard', 'reports'],
  },

  // ── Group E: Finance & Others ──────────────────────────────────
  {
    id: 'nbfc',
    label: 'NBFC / Microfinance',
    group: 'finance',
    defaultModules: ['expenses', 'pnl', 'balance_sheet', 'dashboard', 'reports'],
  },
  {
    id: 'insurance',
    label: 'Insurance Agency',
    group: 'finance',
    defaultModules: ['expenses', 'gst', 'pnl', 'dashboard', 'reports'],
  },
  {
    id: 'ngo',
    label: 'NGO / Trust',
    group: 'finance',
    defaultModules: ['expenses', 'bank', 'pnl', 'balance_sheet', 'dashboard', 'reports'],
  },
  {
    id: 'society',
    label: 'Society / RWA',
    group: 'finance',
    defaultModules: ['expenses', 'bank', 'pnl', 'dashboard', 'reports'],
  },
]

export const INDUSTRY_GROUPS: Record<string, string> = {
  service: 'Service Industry',
  trading: 'Trading',
  professional: 'Professional Services',
  manufacturing: 'Manufacturing & Construction',
  finance: 'Finance & Others',
}

export function getIndustryById(id: string): Industry | undefined {
  return INDUSTRIES.find((i) => i.id === id)
}

export function getIndustriesByGroup(): Record<string, Industry[]> {
  return INDUSTRIES.reduce((acc, industry) => {
    if (!acc[industry.group]) acc[industry.group] = []
    acc[industry.group].push(industry)
    return acc
  }, {} as Record<string, Industry[]>)
}
