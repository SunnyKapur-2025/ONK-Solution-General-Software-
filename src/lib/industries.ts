import { Industry, ModuleKey } from '@/types'

// Core modules every business needs
const CORE: ModuleKey[] = ['dashboard', 'sales', 'purchases', 'expenses', 'receipts', 'payments', 'bank', 'reports']

export const INDUSTRIES: Industry[] = [
  // ── Group A: Service Industry ──────────────────────────────────
  {
    id: 'bpo',
    label: 'BPO / Call Centre',
    group: 'service',
    defaultModules: [...CORE, 'gst', 'payroll', 'debtors', 'creditors', 'pnl'],
  },
  {
    id: 'manpower',
    label: 'Manpower / Staffing Agency',
    group: 'service',
    defaultModules: [...CORE, 'gst', 'attendance', 'payroll', 'debtors', 'creditors', 'pnl'],
  },
  {
    id: 'security',
    label: 'Security Agency',
    group: 'service',
    defaultModules: [...CORE, 'gst', 'attendance', 'payroll', 'debtors', 'creditors', 'pnl'],
  },
  {
    id: 'housekeeping',
    label: 'Housekeeping / Facility Management',
    group: 'service',
    defaultModules: [...CORE, 'gst', 'attendance', 'payroll', 'debtors', 'creditors', 'pnl'],
  },
  {
    id: 'freight',
    label: 'Freight & Forwarding',
    group: 'service',
    defaultModules: [...CORE, 'gst', 'debtors', 'creditors', 'pnl'],
  },
  {
    id: 'courier',
    label: 'Courier & Logistics',
    group: 'service',
    defaultModules: [...CORE, 'gst', 'debtors', 'pnl'],
  },
  {
    id: 'event',
    label: 'Event Management',
    group: 'service',
    defaultModules: [...CORE, 'gst', 'debtors', 'pnl'],
  },
  {
    id: 'advertising',
    label: 'Advertising & PR Agency',
    group: 'service',
    defaultModules: [...CORE, 'gst', 'debtors', 'pnl'],
  },
  {
    id: 'consulting',
    label: 'Consulting / Advisory Firm',
    group: 'service',
    defaultModules: [...CORE, 'gst', 'debtors', 'pnl', 'balance_sheet'],
  },
  {
    id: 'it_services',
    label: 'IT Services & Software Company',
    group: 'service',
    defaultModules: [...CORE, 'gst', 'debtors', 'pnl', 'balance_sheet'],
  },

  // ── Group B: Trading ───────────────────────────────────────────
  {
    id: 'general_trading',
    label: 'General Trading',
    group: 'trading',
    defaultModules: [...CORE, 'gst', 'debtors', 'creditors', 'pnl'],
  },
  {
    id: 'import_export',
    label: 'Import / Export',
    group: 'trading',
    defaultModules: [...CORE, 'gst', 'debtors', 'creditors', 'pnl'],
  },
  {
    id: 'wholesale',
    label: 'Wholesale Distribution',
    group: 'trading',
    defaultModules: [...CORE, 'gst', 'debtors', 'creditors', 'pnl'],
  },
  {
    id: 'retail',
    label: 'Retail Shop',
    group: 'trading',
    defaultModules: [...CORE, 'gst', 'pnl'],
  },

  // ── Group C: Professional Services ────────────────────────────
  {
    id: 'ca_firm',
    label: 'CA / CS / Tax Firm',
    group: 'professional',
    defaultModules: [...CORE, 'gst', 'debtors', 'pnl', 'balance_sheet'],
  },
  {
    id: 'legal',
    label: 'Legal Firm',
    group: 'professional',
    defaultModules: [...CORE, 'debtors', 'pnl'],
  },
  {
    id: 'healthcare',
    label: 'Healthcare / Clinic',
    group: 'professional',
    defaultModules: [...CORE, 'gst', 'debtors', 'pnl'],
  },
  {
    id: 'education',
    label: 'Education / Coaching',
    group: 'professional',
    defaultModules: [...CORE, 'gst', 'debtors', 'pnl'],
  },
  {
    id: 'real_estate',
    label: 'Real Estate / Builder',
    group: 'professional',
    defaultModules: [...CORE, 'gst', 'debtors', 'creditors', 'pnl', 'balance_sheet'],
  },
  {
    id: 'hospitality',
    label: 'Hotel / Restaurant',
    group: 'professional',
    defaultModules: [...CORE, 'gst', 'payroll', 'pnl'],
  },

  // ── Group D: Manufacturing & Construction ─────────────────────
  {
    id: 'manufacturing',
    label: 'Small Manufacturer',
    group: 'manufacturing',
    defaultModules: [...CORE, 'gst', 'debtors', 'creditors', 'pnl', 'balance_sheet'],
  },
  {
    id: 'contractor',
    label: 'Civil Contractor',
    group: 'manufacturing',
    defaultModules: [...CORE, 'gst', 'debtors', 'creditors', 'pnl'],
  },
  {
    id: 'interior',
    label: 'Interior Designer',
    group: 'manufacturing',
    defaultModules: [...CORE, 'gst', 'debtors', 'pnl'],
  },

  // ── Group E: Finance & Others ──────────────────────────────────
  {
    id: 'nbfc',
    label: 'NBFC / Microfinance',
    group: 'finance',
    defaultModules: [...CORE, 'pnl', 'balance_sheet'],
  },
  {
    id: 'insurance',
    label: 'Insurance Agency',
    group: 'finance',
    defaultModules: [...CORE, 'gst', 'pnl'],
  },
  {
    id: 'ngo',
    label: 'NGO / Trust',
    group: 'finance',
    defaultModules: [...CORE, 'pnl', 'balance_sheet'],
  },
  {
    id: 'society',
    label: 'Society / RWA',
    group: 'finance',
    defaultModules: [...CORE, 'pnl'],
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
