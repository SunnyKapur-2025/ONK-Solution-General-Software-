# ONK Solution — Architecture & Framework Blueprint

**Version:** 1.0  
**Date:** 2026-06-10  
**Status:** Architecture Phase — Pre-Development  
**Domain:** Multi-Tenant SaaS — Indian Service Industry  
**Prepared for:** ONK Solution

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Target Users & Business Context](#2-target-users--business-context)
3. [Tech Stack](#3-tech-stack)
4. [Multi-Tenancy Architecture](#4-multi-tenancy-architecture)
5. [Authentication & Authorization Model](#5-authentication--authorization-model)
6. [Database Schema Design](#6-database-schema-design)
7. [Module Breakdown](#7-module-breakdown)
8. [Security Model](#8-security-model)
9. [Subscription & Licensing Model](#9-subscription--licensing-model)
10. [Report Access Control System](#10-report-access-control-system)
11. [API Architecture](#11-api-architecture)
12. [File Storage & Invoice Customization](#12-file-storage--invoice-customization)
13. [Export & Integration Layer](#13-export--integration-layer)
14. [Infrastructure & DevOps](#14-infrastructure--devops)
15. [Indian Regulatory Compliance](#15-indian-regulatory-compliance)
16. [Phased Build Roadmap](#16-phased-build-roadmap)
17. [Key Technical Decisions & Rationale](#17-key-technical-decisions--rationale)
18. [Risk Register](#18-risk-register)

---

## 1. Product Overview

ONK Solution is a multi-tenant, subscription-based SaaS platform built for the Indian service industry. It consolidates financial management, statutory compliance, payroll, and operational reporting into a single, professionally delivered product.

The platform serves businesses that handle high volumes of transactions, statutory filings, and workforce management — industries where financial accuracy, audit trails, and regulatory compliance are non-negotiable. Every feature is designed with Indian accounting standards (ICAI), Indian tax law (GST, TDS, Income Tax Act 2025), and Companies Act Schedule III in mind.

**Core value proposition:**

- One platform replaces standalone accounting software, payroll tools, GST filing utilities, and TDS reconciliation sheets
- Developer-controlled report visibility ensures clients only see what they are licensed and cleared to see
- Financial data is tenant-isolated at the database level, not just the application level
- Exportable to Tally, Busy, and Zoho so clients do not lose compatibility with their CA's preferred tools

---

## 2. Target Users & Business Context

| Industry Segment | Key Financial Complexity |
|---|---|
| BPO | Multi-client billing, TDS on services, large payroll |
| Manpower Recruiting | Placement fees, contractor payroll, 26AS reconciliation |
| Security Agencies | Shift-based attendance, client-billed manpower, PF/ESI compliance |
| Freight & Forwarding | Multi-leg billing, freight income/expense matching, GST on transport |
| General Service Industry | GST compliance, debtors/creditors aging, P&L reporting |

**User Roles (per tenant):**

- **Owner/Admin** — Full access within their tenant
- **Accountant** — Accounting, GST, TDS, payroll modules
- **Manager** — Dashboard, reports (as permitted)
- **Staff** — Attendance and limited operational data
- **Developer/Super-Admin** — Cross-tenant; controls report visibility flags per tenant

---

## 3. Tech Stack

### 3.1 Chosen Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR for performance, API routes as BFF, strong TypeScript support |
| Frontend Hosting | Vercel | Zero-config deploys, edge network, preview URL per PR, custom domain free |
| Backend | Cloudflare Workers | 100,000 free requests/day, zero cold starts (V8 isolates), edge performance |
| Database | **Neon** (long-term) | Serverless Postgres, economical at scale, Git-like DB branching, no aggressive pausing |
| Database (early dev) | **Supabase** (short-term) | Postgres + Auth + Storage + Realtime in one dashboard; free tier for development |
| Authentication | Supabase Auth (dev) → Neon + Cloudflare (prod) | JWT-based, email/password, OTP; integrates with RLS |
| File Storage | **Cloudflare R2** | No egress fees, generous free tier, tenant-scoped for logos/documents/backups |
| ORM / Query Layer | Prisma | Type-safe queries, migration management, works with both Neon and Supabase |
| Background Jobs | Inngest | Payroll runs, GST matching, report generation, scheduled reminders |
| Email | **Resend** | 3,000 emails/month free, React Email templates, best developer experience |
| PDF Generation | `@react-pdf/renderer` | Branded invoice and report PDF export, runs in Cloudflare Workers |
| Monitoring & Errors | **Sentry** | 5,000 errors/month free, exact line + user context, instant Slack/email alerts |
| Analytics | **PostHog** | 1M events/month free, session replay, funnels, feature flags, A/B testing |
| Search | PostgreSQL Full-Text Search | Party name, invoice number, ledger search — no external dependency |
| Payments | **Razorpay** or **Dodo Payments** | Both India-ready, free to integrate, percentage per transaction only |

### 3.2 Supporting Tools

| Purpose | Tool | Notes |
|---|---|---|
| Domain | **Namecheap** or **Cloudflare Registrar** | Cloudflare = actual cost price, zero markup. Avoid GoDaddy. |
| Secrets Management | Vercel + Cloudflare Environment Variables | Never in code; `.env.example` committed with placeholders only |
| Scheduled Tasks | Inngest Cron | GSTR-1 due date alerts, payroll cycle reminders, backup triggers |
| Audit Logging | Custom `audit_log` table + PostgreSQL triggers | Immutable financial audit trail, mandatory for CA compliance |
| Data Validation | Zod | Runtime schema validation at all API boundaries |
| Component Library | shadcn/ui + Tailwind CSS | Accessible, composable, no vendor lock-in |
| State Management | Zustand + TanStack Query | Server state via TanStack Query; local UI state via Zustand |
| Testing | Vitest + Playwright | Unit/integration tests; end-to-end for critical financial flows |
| Version Control | **GitHub** | Free public/private repos; Vercel auto-deploys on every push |
| CI/CD | GitHub Actions + Vercel | Automated tests on PR; Vercel handles preview and production deploys |

### 3.3 Total Infrastructure Cost

| Tool | What It Covers | Cost |
|---|---|---|
| Vercel | Frontend hosting + functions | Free |
| Cloudflare Workers | Backend / API | Free |
| Neon | PostgreSQL database | Free |
| Cloudflare R2 | File storage + backups | Free |
| Supabase (dev only) | DB + Auth during development | Free |
| Razorpay / Dodo | Payments | Free (% per transaction) |
| PostHog | Analytics | Free |
| Sentry | Error tracking | Free |
| Resend | Transactional email | Free |
| GitHub | Version control | Free |
| **Domain (onksolutions.in)** | **Namecheap / Cloudflare** | **~₹800–1,500/year** |
| **Total ongoing cost** | | **~₹800–1,500/year** |

> The entire platform runs on free tiers until significant scale. The only mandatory spend is the domain name.

---

## 4. Multi-Tenancy Architecture

### 4.1 Tenancy Model: Shared Database, Tenant-Isolated via RLS

All tenants share a single PostgreSQL database on Supabase. Tenant isolation is enforced at the row level using PostgreSQL Row Level Security policies. This is the most cost-effective model for a SaaS product targeting SMB clients in India, and Supabase's RLS implementation makes it provably secure when implemented correctly.

**Why not schema-per-tenant or database-per-tenant?**

- Schema-per-tenant: Difficult to manage migrations across hundreds of tenants; Supabase does not support this natively at scale
- Database-per-tenant: Extremely expensive; overkill for the target market
- Shared DB + RLS: Standard for Supabase-based SaaS; tenant data never crosses boundaries at the query level

### 4.2 Tenant Identification

Every table that holds tenant-specific data includes a `tenant_id` column of type `uuid`. This column references the `tenants` table.

The authenticated user's JWT contains a `tenant_id` claim. Every RLS policy checks `auth.jwt() ->> 'tenant_id'` against the row's `tenant_id`. No query can return rows from a different tenant regardless of application-layer bugs.

### 4.3 RLS Policy Pattern

```sql
-- Applied to every tenant-scoped table
CREATE POLICY "tenant_isolation"
ON public.journal_entries
FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

The `tenant_id` claim is injected into the JWT via a Supabase Auth hook at login time, pulling from the `tenant_users` join table.

### 4.4 Tenant Provisioning Flow

```
Developer creates tenant record
  -> Supabase Auth user created with tenant_id claim
  -> Default role assigned (owner)
  -> Subscription record created
  -> Report visibility flags initialized (all locked by default)
  -> Tenant onboarding email sent via Resend
```

Tenant provisioning is a developer-gated action. Clients cannot self-register. This is intentional — it keeps the platform closed, professional, and under developer control.

---

## 5. Authentication & Authorization Model

### 5.1 Authentication

Supabase Auth handles all authentication. Email + password login is the primary method. OTP via email can be enabled per tenant for higher-security clients.

On login, Supabase Auth returns a JWT. A custom Auth Hook (PostgreSQL function triggered post-login) enriches the JWT with:

```json
{
  "sub": "<user_uuid>",
  "email": "user@client.com",
  "tenant_id": "<tenant_uuid>",
  "role": "accountant",
  "report_permissions": ["profit_loss", "balance_sheet"],
  "app_metadata": {
    "is_super_admin": false
  }
}
```

### 5.2 Role Hierarchy

```
super_admin (developer)
  └── tenant_owner
        └── tenant_admin
              ├── accountant
              ├── manager
              └── staff
```

| Role | Scope | Capabilities |
|---|---|---|
| `super_admin` | All tenants | Toggle report flags, manage subscriptions, impersonate tenant for support |
| `tenant_owner` | Own tenant | All modules, user management, billing |
| `tenant_admin` | Own tenant | All modules except billing |
| `accountant` | Own tenant | Accounting, GST, TDS, payroll, reports (as permitted) |
| `manager` | Own tenant | Dashboard, permitted reports, read-only ledgers |
| `staff` | Own tenant | Attendance entry, own payslip view |

### 5.3 Permission Enforcement — Two Layers

**Layer 1 — Database (RLS):** Enforces tenant isolation. Cannot be bypassed by application code.

**Layer 2 — Application (Middleware + API):** Enforces role-based module access. Next.js middleware checks the decoded JWT role before routing to protected pages. API routes validate role claims before executing queries.

Both layers must pass. A user with a valid tenant JWT but insufficient role is blocked at the API layer before any DB query is made.

### 5.4 Super-Admin Access

The super-admin (developer) uses a separate Supabase service role key that bypasses RLS. This key is never exposed to the frontend or to tenant users. All super-admin operations happen via a separate internal admin panel hosted on a non-public route, protected by an additional secret token.

---

## 6. Database Schema Design

### 6.1 Core Tables

```sql
-- Tenant registry
tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                    -- Business name
  slug text UNIQUE NOT NULL,             -- URL-safe identifier
  gstin text,                            -- GST registration number
  pan text,                              -- PAN
  address jsonb,                         -- Structured address
  subscription_plan text,                -- 'starter' | 'professional' | 'enterprise'
  subscription_status text,             -- 'active' | 'suspended' | 'expired'
  subscription_expires_at timestamptz,
  financial_year_start date,             -- Typically April 1
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Users linked to tenants
tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,                    -- 'owner' | 'admin' | 'accountant' | 'manager' | 'staff'
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, user_id)
)

-- Report visibility flags (developer-controlled)
tenant_report_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  report_key text NOT NULL,              -- e.g. 'profit_loss', 'balance_sheet', 'gstr1'
  is_enabled boolean DEFAULT false,      -- Locked by default
  enabled_by uuid,                       -- super_admin user_id who enabled it
  enabled_at timestamptz,
  notes text,
  UNIQUE(tenant_id, report_key)
)

-- Chart of Accounts
chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,                    -- e.g. '1001', '2001'
  name text NOT NULL,
  account_type text NOT NULL,            -- 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  account_subtype text,                  -- e.g. 'current_asset', 'fixed_asset'
  schedule_iii_head text,               -- Companies Act Schedule III mapping
  parent_id uuid REFERENCES chart_of_accounts(id),
  is_system boolean DEFAULT false,      -- System accounts cannot be deleted
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, code)
)

-- Journal Entries (double-entry core)
journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  entry_number text NOT NULL,
  entry_date date NOT NULL,
  financial_year text NOT NULL,          -- e.g. '2025-26'
  narration text,
  reference_type text,                   -- 'sale' | 'purchase' | 'expense' | 'payment' | 'receipt' | 'manual'
  reference_id uuid,                     -- FK to source document
  is_posted boolean DEFAULT false,
  posted_by uuid,
  posted_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, entry_number)
)

-- Journal Entry Lines (debit/credit)
journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id uuid REFERENCES chart_of_accounts(id),
  debit numeric(18,2) DEFAULT 0,
  credit numeric(18,2) DEFAULT 0,
  narration text,
  CONSTRAINT debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
  )
)

-- Parties (customers and vendors)
parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  party_type text NOT NULL,              -- 'customer' | 'vendor' | 'both'
  gstin text,
  pan text,
  address jsonb,
  contact_name text,
  contact_phone text,
  contact_email text,
  credit_limit numeric(18,2),
  credit_days integer,
  tds_applicable boolean DEFAULT false,
  tds_section text,                      -- e.g. '194C', '194J'
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- Sales Invoices
sales_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  financial_year text NOT NULL,
  party_id uuid REFERENCES parties(id),
  place_of_supply text,                  -- State code for GST
  invoice_type text,                     -- 'b2b' | 'b2c' | 'export' | 'nil_rated'
  subtotal numeric(18,2) NOT NULL,
  cgst numeric(18,2) DEFAULT 0,
  sgst numeric(18,2) DEFAULT 0,
  igst numeric(18,2) DEFAULT 0,
  tds_deducted numeric(18,2) DEFAULT 0,
  total numeric(18,2) NOT NULL,
  payment_status text DEFAULT 'unpaid',  -- 'unpaid' | 'partial' | 'paid'
  due_date date,
  journal_entry_id uuid REFERENCES journal_entries(id),
  custom_template_id uuid,              -- Branded invoice template
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, invoice_number)
)

-- Sales Invoice Line Items
sales_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  invoice_id uuid REFERENCES sales_invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  hsn_sac text,                          -- HSN or SAC code
  quantity numeric(12,3),
  unit text,
  rate numeric(18,2),
  amount numeric(18,2) NOT NULL,
  gst_rate numeric(5,2),                 -- e.g. 18.00 for 18%
  cgst_amount numeric(18,2) DEFAULT 0,
  sgst_amount numeric(18,2) DEFAULT 0,
  igst_amount numeric(18,2) DEFAULT 0
)

-- Purchase Invoices (mirror of sales)
purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  vendor_invoice_number text,
  our_reference text NOT NULL,
  invoice_date date NOT NULL,
  financial_year text NOT NULL,
  party_id uuid REFERENCES parties(id),
  subtotal numeric(18,2) NOT NULL,
  cgst numeric(18,2) DEFAULT 0,
  sgst numeric(18,2) DEFAULT 0,
  igst numeric(18,2) DEFAULT 0,
  tds_to_deduct numeric(18,2) DEFAULT 0,
  total numeric(18,2) NOT NULL,
  payment_status text DEFAULT 'unpaid',
  journal_entry_id uuid REFERENCES journal_entries(id),
  itc_eligible boolean DEFAULT true,
  itc_status text DEFAULT 'pending',     -- 'pending' | 'matched' | 'mismatched'
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
)

-- GST Returns Data
gst_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  return_type text NOT NULL,             -- 'GSTR1' | 'GSTR2A' | 'GSTR2B' | 'GSTR3B'
  financial_year text NOT NULL,
  period text NOT NULL,                  -- 'MMYYYY' e.g. '042025'
  data jsonb NOT NULL,                   -- Raw return data from GSTN portal upload
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid NOT NULL,
  UNIQUE(tenant_id, return_type, period)
)

-- GST Reconciliation
gst_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  period text NOT NULL,
  purchase_invoice_id uuid REFERENCES purchase_invoices(id),
  gstr2b_entry_id text,                  -- Reference in uploaded GSTR-2B
  books_igst numeric(18,2),
  books_cgst numeric(18,2),
  books_sgst numeric(18,2),
  portal_igst numeric(18,2),
  portal_cgst numeric(18,2),
  portal_sgst numeric(18,2),
  match_status text,                     -- 'matched' | 'mismatched' | 'missing_in_books' | 'missing_in_portal'
  reconciled_at timestamptz,
  notes text
)

-- TDS Records
tds_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  entry_type text NOT NULL,              -- 'deducted' | 'received'
  party_id uuid REFERENCES parties(id),
  section text NOT NULL,                 -- '194C', '194J', '192', etc.
  financial_year text NOT NULL,
  quarter text NOT NULL,                 -- 'Q1' | 'Q2' | 'Q3' | 'Q4'
  gross_amount numeric(18,2) NOT NULL,
  tds_rate numeric(5,2),
  tds_amount numeric(18,2) NOT NULL,
  certificate_number text,               -- TDS certificate number
  deduction_date date,
  payment_date date,
  reference_id uuid,                     -- Source invoice
  created_at timestamptz DEFAULT now()
)

-- 26AS Reconciliation
tds_26as_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  financial_year text NOT NULL,
  quarter text NOT NULL,
  tds_entry_id uuid REFERENCES tds_entries(id),
  form_26as_data jsonb,                  -- Uploaded 26AS data
  books_amount numeric(18,2),
  form_26as_amount numeric(18,2),
  match_status text,                     -- 'matched' | 'mismatched' | 'missing'
  notes text
)

-- Bank Accounts
bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  account_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text,
  ifsc_code text,
  account_type text,                     -- 'savings' | 'current' | 'cc' | 'od'
  opening_balance numeric(18,2) DEFAULT 0,
  gl_account_id uuid REFERENCES chart_of_accounts(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- Bank Statements (uploaded)
bank_statement_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  bank_account_id uuid REFERENCES bank_accounts(id),
  transaction_date date NOT NULL,
  value_date date,
  description text,
  debit numeric(18,2) DEFAULT 0,
  credit numeric(18,2) DEFAULT 0,
  balance numeric(18,2),
  reference text,
  reconciliation_status text DEFAULT 'unreconciled',
  matched_entry_id uuid,
  uploaded_at timestamptz DEFAULT now()
)

-- Bank Reconciliation
bank_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  bank_account_id uuid REFERENCES bank_accounts(id),
  reconciliation_date date NOT NULL,
  statement_balance numeric(18,2) NOT NULL,
  book_balance numeric(18,2) NOT NULL,
  difference numeric(18,2),
  status text DEFAULT 'draft',           -- 'draft' | 'completed'
  prepared_by uuid,
  completed_at timestamptz
)

-- Fixed Assets (for Depreciation)
fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  asset_name text NOT NULL,
  asset_category text NOT NULL,          -- e.g. 'furniture', 'computers', 'vehicles'
  purchase_date date NOT NULL,
  purchase_amount numeric(18,2) NOT NULL,
  useful_life_years integer,
  companies_act_rate numeric(5,2),      -- WDV rate as per Companies Act
  income_tax_rate numeric(5,2),         -- WDV rate as per Income Tax Act 2025
  gl_account_id uuid REFERENCES chart_of_accounts(id),
  accumulated_depreciation numeric(18,2) DEFAULT 0,
  net_book_value numeric(18,2),
  disposal_date date,
  disposal_amount numeric(18,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)

-- Depreciation Schedule
depreciation_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  asset_id uuid REFERENCES fixed_assets(id),
  financial_year text NOT NULL,
  method text NOT NULL,                  -- 'companies_act_wdv' | 'slm' | 'income_tax_wdv'
  opening_wdv numeric(18,2) NOT NULL,
  depreciation_amount numeric(18,2) NOT NULL,
  closing_wdv numeric(18,2) NOT NULL,
  journal_entry_id uuid REFERENCES journal_entries(id),
  UNIQUE(tenant_id, asset_id, financial_year, method)
)

-- Employees
employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_code text NOT NULL,
  name text NOT NULL,
  designation text,
  department text,
  client_id uuid REFERENCES parties(id),  -- Which client this employee is deployed to (security/manpower)
  date_of_joining date,
  date_of_leaving date,
  pan text,
  aadhaar_masked text,                   -- Last 4 digits only
  pf_number text,
  esi_number text,
  basic_salary numeric(18,2),
  hra numeric(18,2),
  other_allowances jsonb,
  tds_applicable boolean DEFAULT false,
  bank_account jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, employee_code)
)

-- Attendance
attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_id uuid REFERENCES employees(id),
  attendance_date date NOT NULL,
  status text NOT NULL,                  -- 'present' | 'absent' | 'half_day' | 'holiday' | 'leave'
  shift text,
  check_in time,
  check_out time,
  overtime_hours numeric(4,2) DEFAULT 0,
  marked_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, employee_id, attendance_date)
)

-- Payroll Processing
payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  financial_year text NOT NULL,
  month text NOT NULL,                   -- 'MMYYYY'
  status text DEFAULT 'draft',           -- 'draft' | 'processed' | 'approved' | 'paid'
  total_gross numeric(18,2),
  total_deductions numeric(18,2),
  total_net numeric(18,2),
  processed_by uuid,
  approved_by uuid,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, financial_year, month)
)

-- Payroll Lines (per employee per run)
payroll_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  payroll_run_id uuid REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id),
  working_days integer,
  present_days numeric(5,2),
  gross_salary numeric(18,2),
  basic numeric(18,2),
  hra numeric(18,2),
  other_allowances jsonb,
  pf_employee numeric(18,2) DEFAULT 0,
  esi_employee numeric(18,2) DEFAULT 0,
  tds numeric(18,2) DEFAULT 0,
  other_deductions jsonb,
  net_salary numeric(18,2),
  payslip_generated boolean DEFAULT false,
  journal_entry_id uuid REFERENCES journal_entries(id)
)

-- Client Invoices from Manpower/Attendance
manpower_client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  sales_invoice_id uuid REFERENCES sales_invoices(id),
  payroll_run_id uuid REFERENCES payroll_runs(id),
  client_id uuid REFERENCES parties(id),
  billing_period text NOT NULL,
  employee_count integer,
  man_days numeric(8,2),
  billing_rate numeric(18,2),
  subtotal numeric(18,2),
  notes text,
  created_at timestamptz DEFAULT now()
)

-- Loans & Advances
loans_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  loan_type text NOT NULL,               -- 'loan_given' | 'loan_taken' | 'advance_given' | 'advance_received'
  party_id uuid REFERENCES parties(id),
  employee_id uuid REFERENCES employees(id),
  amount numeric(18,2) NOT NULL,
  interest_rate numeric(5,2) DEFAULT 0,
  disbursement_date date,
  due_date date,
  repayment_schedule jsonb,
  outstanding_balance numeric(18,2),
  status text DEFAULT 'active',          -- 'active' | 'closed' | 'overdue'
  gl_account_id uuid REFERENCES chart_of_accounts(id),
  journal_entry_id uuid REFERENCES journal_entries(id),
  created_at timestamptz DEFAULT now()
)

-- Invoice Templates (branding)
invoice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  template_name text NOT NULL,
  logo_url text,
  company_details jsonb,                 -- Name, address, GSTIN, CIN, etc.
  color_scheme jsonb,
  custom_fields jsonb,
  footer_text text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
)

-- Audit Log (immutable)
audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  user_id uuid,
  action text NOT NULL,                  -- 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT'
  table_name text,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
  -- No UPDATE or DELETE policy on this table
)
```

### 6.2 Indexes

```sql
-- All tenant_id columns are indexed
CREATE INDEX ON journal_entries(tenant_id, entry_date);
CREATE INDEX ON journal_entries(tenant_id, financial_year);
CREATE INDEX ON sales_invoices(tenant_id, party_id);
CREATE INDEX ON sales_invoices(tenant_id, invoice_date);
CREATE INDEX ON purchase_invoices(tenant_id, party_id);
CREATE INDEX ON attendance(tenant_id, employee_id, attendance_date);
CREATE INDEX ON payroll_lines(tenant_id, payroll_run_id);
CREATE INDEX ON audit_log(tenant_id, created_at);
CREATE INDEX ON tds_entries(tenant_id, financial_year, quarter);
```

### 6.3 Financial Year Scoping

Every transaction table includes a `financial_year` column (format: `'2025-26'`). This is denormalized for query performance. All reports are scoped to financial year first, then date range within that year. Indian financial year runs April 1 to March 31.

---

## 7. Module Breakdown

### 7.1 Accounting & Bookkeeping

**Scope:** Full double-entry accounting system.

**Features:**
- Chart of Accounts with Schedule III mapping
- Journal entry creation (manual and system-generated)
- Sales invoices with GST calculation (CGST/SGST for intrastate, IGST for interstate)
- Purchase invoices with ITC tracking
- Expense vouchers (direct expense entry)
- Receipt and payment vouchers
- Contra entries (bank-to-bank, bank-to-cash)
- Ledger view per account with running balance
- Trial balance (real-time, any date range)

**Auto-posting rule:** Every sales invoice, purchase invoice, payroll run, and bank transaction auto-generates a journal entry. Manual entries are supported for adjustments. Posted entries cannot be edited — only reversed via a new contra entry, maintaining audit integrity.

### 7.2 GST Reconciliation System

**Scope:** GSTR-1 outward supplies, GSTR-2A/2B inward supplies, GSTR-3B summary.

**Flow:**

```
1. User uploads GSTR-2B JSON/Excel from GSTN portal
2. System parses and stores in gst_returns table
3. Reconciliation engine matches:
   - Vendor GSTIN + Invoice Number + Invoice Date + Amount
   - Tolerance: ±Rs 1 for rounding differences
4. Match statuses assigned: matched | mismatched | missing_in_books | missing_in_portal
5. Report shows ITC eligible vs. claimed vs. matched
6. Accountant resolves mismatches manually with notes
7. GSTR-3B pre-fill generated from books data
```

**GSTR-1 preparation:** System aggregates sales invoices by supply type (B2B, B2C, exports, nil-rated) and generates GSTR-1 JSON in the format accepted by the GSTN portal for direct upload.

### 7.3 TDS Reconciliation

**Scope:** TDS deducted on vendor payments, TDS received from customers; 26AS matching.

**Flow:**

```
1. TDS entries auto-created when invoices with TDS sections are processed
2. User uploads Form 26AS (XML or PDF parsed) or enters manually
3. System matches: PAN + Section + Quarter + Amount
4. Mismatches flagged for review
5. TDS certificate register maintained (Form 16A issuance tracking)
6. Quarterly summary for TDS return preparation (24Q, 26Q)
```

### 7.4 Cash Management System

**Features:**
- Multiple cash accounts (petty cash, main cash)
- Cash receipt and payment vouchers
- Daily cash book (opening balance, receipts, payments, closing balance)
- Cash flow projection (7-day, 30-day)
- Cash limit alerts (configurable per account)
- Denomination-level denomination register (optional, for cash-heavy businesses)

### 7.5 Bank Reconciliation

**Features:**
- Bank statement upload (CSV, Excel, OFX formats)
- Auto-matching engine: date + amount + reference number
- Manual matching for unmatched items
- Outstanding cheques and deposits in transit tracking
- Bank reconciliation statement generation (formal format)
- Support for multiple bank accounts

### 7.6 Profit & Loss Statement

Three modes:

| Mode | Description |
|---|---|
| Actual | Based on posted journal entries up to selected date |
| Provisional | Includes estimated accruals flagged as provisional |
| Projected | Based on projections entered by management |

**Format:** Compliant with Companies Act Schedule III Part II (Statement of Profit and Loss). Supports comparison across periods (month vs. month, year vs. year). Drill-down from any line item to underlying ledger entries.

### 7.7 Balance Sheet

**Format:** Companies Act 2013, Schedule III Part I. Groupings follow ICAI guidelines.

```
EQUITY & LIABILITIES                    ASSETS
  Share Capital                           Fixed Assets (Tangible, Intangible)
  Reserves & Surplus                      Capital Work in Progress
  Long-term Borrowings                    Long-term Investments
  Deferred Tax Liabilities                Long-term Loans & Advances
  Short-term Borrowings                   Current Assets
  Trade Payables                            Inventories
  Other Current Liabilities                 Trade Receivables
  Short-term Provisions                     Cash & Cash Equivalents
                                            Short-term Loans & Advances
```

The balance sheet auto-derives from the Chart of Accounts `schedule_iii_head` mapping. Each account is mapped once; the balance sheet assembles automatically.

### 7.8 Cash Flow Statement

Both methods supported:

**Direct Method:** Cash received from customers, cash paid to suppliers and employees, net cash from operations — directly from cash/bank ledgers.

**Indirect Method:** Starts from net profit, adjusts for non-cash items (depreciation, provisions), working capital changes, investing activities (asset purchases/disposals), financing activities (loans, capital).

Output is formatted per AS 3 (Accounting Standard 3) and Ind AS 7.

### 7.9 Depreciation Module

Dual depreciation books maintained simultaneously:

| Book | Method | Rate Source |
|---|---|---|
| Companies Act | WDV (Written Down Value) | Schedule II, Companies Act 2013 |
| Income Tax | WDV | Income Tax Act 2025 (updated rates) |

**Features:**
- Asset register with full history
- Automatic depreciation calculation on financial year close
- Partial year depreciation (pro-rata for new additions/disposals)
- Deferred tax calculation (timing difference between both books)
- Asset disposal gain/loss calculation
- Block-wise depreciation for Income Tax Act compliance

### 7.10 Debtors & Creditors Management

**Aging buckets:** 0-30, 31-60, 61-90, 91-180, 181-365, 365+ days

**Features:**
- Party-wise outstanding (invoice-level detail)
- Aging summary and aging detail reports
- Overdue alerts (configurable days)
- Payment follow-up log (manual notes per party)
- Debtor/creditor turnover ratio
- Days Sales Outstanding (DSO) and Days Payable Outstanding (DPO)

### 7.11 Loans & Advances

**Types tracked:**
- Loans given (to employees, third parties)
- Loans taken (from banks, directors, institutions)
- Advances given (to vendors, employees)
- Advances received (from customers)

**Features:**
- Disbursement and repayment tracking
- Interest accrual (simple and compound)
- EMI schedule generation
- Overdue tracking and alerts
- Balance confirmation letters (PDF export)

### 7.12 Staff Attendance & Payroll

Designed specifically for manpower agencies and security firms where employees are deployed to client sites.

**Attendance Flow:**

```
Attendance Entry (daily/bulk import via Excel)
  -> Monthly attendance sheet finalized
  -> System computes: working days, present days, leaves, overtime
  -> Feeds into payroll calculation
```

**Payroll Flow:**

```
Payroll Initiation (monthly)
  -> Attendance data pulled automatically
  -> Salary computed: Basic + HRA + Allowances - PF - ESI - TDS - Advances
  -> Payslip generated (PDF, branded)
  -> Journal entry auto-posted
  -> Bank payment file generated (NEFT/RTGS format)
  -> Client Invoice auto-generated based on man-days billed
```

**Statutory deductions handled:**
- PF (12% employee + 12% employer, wage ceiling aware)
- ESI (0.75% employee + 3.25% employer, wage ceiling aware)
- Professional Tax (state-wise rates configurable)
- TDS on salary (as per tax slab, Form 12BB input)

**Client Invoice Generation:** For manpower/security businesses, after payroll is processed, the system auto-generates a sales invoice to the client for the man-days deployed, at the contracted billing rate, with appropriate GST.

### 7.13 Interactive Management Dashboard

**Filters available simultaneously:**
- Financial year / date range
- Client (party)
- Segment (BPO, security, freight, etc. — configurable tag)
- Geography (state, city — from party address)
- Department / cost center

**Widgets:**
- Revenue trend (month-over-month)
- Outstanding receivables with aging split
- Outstanding payables with aging split
- Cash and bank position
- GST liability this month
- TDS receivable this quarter
- Top 10 clients by revenue
- Top 10 vendors by spend
- Payroll cost vs. billing revenue (for manpower segments)
- P&L summary (current month and YTD)

**Technology:** Supabase Realtime for live updates on dashboard. TanStack Query for client-side data fetching with 5-minute stale time on financial summaries.

### 7.14 Export to Accounting Software

| Format | Target Software | Method |
|---|---|---|
| Tally XML | Tally Prime / ERP 9 | Custom XML generator following Tally's import schema |
| Busy XML/CSV | Busy Accounting Software | CSV/XML in Busy's voucher import format |
| Zoho Books CSV | Zoho Books | CSV following Zoho's contact/invoice/journal import format |

**Export scope:** Chart of accounts, journal entries, parties, invoices — all for a selected date range. Export jobs run as background tasks via Inngest (large datasets). User receives download link via email when ready.

### 7.15 Report Access Control

Covered in detail in Section 10.

### 7.16 Invoice Customization

Covered in detail in Section 12.

---

## 8. Security Model

### 8.1 Data Security — Layers

```
Layer 1: Network        — HTTPS only (Vercel + Supabase enforce TLS 1.2+)
Layer 2: Authentication — Supabase Auth JWT; tokens expire in 1 hour; refresh tokens rotate
Layer 3: Authorization  — Role checks in Next.js middleware and API route handlers
Layer 4: Database       — Row Level Security on every tenant-scoped table
Layer 5: Audit          — Immutable audit_log; all writes, logins, and exports recorded
Layer 6: Secrets        — All keys in Vercel/Supabase environment variables; never in code
```

### 8.2 Row Level Security — Enforcement Rules

- Every tenant-scoped table has an RLS policy enabling reads/writes only when `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid`
- The `audit_log` table has an INSERT-only policy for authenticated users; no UPDATE or DELETE policy exists for any role
- The `tenant_report_permissions` table has a SELECT policy for all authenticated tenant users but INSERT/UPDATE restricted to `super_admin` role only
- The service role key (bypasses RLS) is used only in server-side Inngest workers and the admin panel — never in any client-facing code

### 8.3 Financial Data Integrity

**Double-entry enforcement:** A database trigger verifies that every `journal_entries` record has balanced debits and credits in `journal_entry_lines` before the entry is marked as posted. An entry where debits ≠ credits cannot be posted.

```sql
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debit numeric;
  total_credit numeric;
BEGIN
  SELECT SUM(debit), SUM(credit)
  INTO total_debit, total_credit
  FROM journal_entry_lines
  WHERE journal_entry_id = NEW.id;

  IF total_debit != total_credit THEN
    RAISE EXCEPTION 'Journal entry imbalanced: debit=% credit=%', total_debit, total_credit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_journal_balance
BEFORE UPDATE OF is_posted ON journal_entries
FOR EACH ROW
WHEN (NEW.is_posted = true AND OLD.is_posted = false)
EXECUTE FUNCTION check_journal_balance();
```

**No delete on posted entries:** A trigger prevents deletion of any journal entry where `is_posted = true`. Corrections must be made via reversal entries, maintaining a complete audit trail.

**Numeric precision:** All monetary values use `numeric(18,2)` — never `float` or `double` — to avoid floating point rounding errors in financial calculations.

### 8.4 Audit Trail

Every INSERT, UPDATE, and DELETE on key financial tables (journal entries, invoices, payroll, GST) is captured by a PostgreSQL trigger writing to `audit_log`. The `audit_log` table has no UPDATE or DELETE RLS policies for any user, including the tenant owner.

```sql
-- Example audit trigger (applied to all financial tables)
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log(tenant_id, user_id, action, table_name, record_id, old_values, new_values)
  VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.5 Input Validation & Injection Prevention

- All API inputs validated with Zod schemas before any database operation
- Supabase JS client uses parameterized queries by default; raw SQL is used only in server-side Prisma queries with typed parameters
- GSTIN, PAN, and bank account numbers are validated against their checksum algorithms before storage

### 8.6 Session Management

- JWT access tokens: 1-hour expiry
- Refresh tokens: 7-day expiry, rotate on use
- Concurrent session limit: configurable per tenant (default: 5 sessions per user)
- Failed login attempts: lockout after 10 failures in 15 minutes (enforced via Upstash Redis rate limiter in the auth API route)
- Session invalidation on password change affects all active sessions

### 8.7 Data Residency

Supabase project region should be set to **ap-south-1 (Mumbai)** or **ap-southeast-1 (Singapore)** to keep Indian financial data within the Asia-Pacific region. As of 2026, Supabase supports the Mumbai region. This should be confirmed at project creation and documented in the deployment checklist.

### 8.8 Backup and Recovery

- Supabase provides daily automated backups (Pro plan: 7-day retention; Team plan: 30-day)
- Point-in-time recovery (PITR) enabled on the Team or Enterprise plan — required for a financial product
- Application-level export: any tenant's data can be exported to JSON/CSV on request by the super-admin

---

## 9. Subscription & Licensing Model

### 9.1 Plans

| Plan | Target | Modules Included | Users |
|---|---|---|---|
| Starter | Small businesses, sole proprietors | Accounting, GST, TDS, Bank Recon, P&L, Balance Sheet | 2 |
| Professional | Mid-size service businesses | All Starter + Cash Flow, Depreciation, Debtors/Creditors, Loans, Payroll | 10 |
| Enterprise | Large manpower/security agencies | All modules + Attendance, Client invoicing, Dashboard, All exports | Unlimited |
| One-Time License | Single business, perpetual use | All modules (current version) | 5 |

### 9.2 Subscription Enforcement

Plan limits are stored in `tenants.subscription_plan` and `tenants.subscription_status`. A middleware function checks subscription status on every API request. If status is `'expired'` or `'suspended'`:

- Read-only access to existing data is maintained (clients can still view and export their history)
- Write operations are blocked
- A persistent banner on the frontend prompts renewal

Module access is controlled by a separate `subscription_module_flags` table (similar architecture to `tenant_report_permissions`) so individual modules can be toggled per tenant regardless of plan.

### 9.3 Billing

For subscription billing, integrate **Razorpay Subscriptions** (Indian payment gateway, supports auto-debit, UPI, NEFT). Razorpay webhook events update `tenants.subscription_status` and `tenants.subscription_expires_at` in real time via a Vercel API route.

For one-time licenses, a single Razorpay payment order is created; on successful payment, the tenant record is activated permanently.

---

## 10. Report Access Control System

### 10.1 Design Philosophy

Reports in this platform represent sensitive financial data. Access is locked by default. The developer (super-admin) is the sole authority who enables which reports each tenant can view. This is a deliberate product decision — it allows the developer to:

- Gate access to advanced reports as part of higher subscription tiers
- Ensure tenants have been onboarded and trained before accessing complex reports
- Prevent misuse or misinterpretation of sensitive financial statements

### 10.2 Report Registry

A hardcoded registry of all report keys maintained in application code:

```typescript
export const REPORT_REGISTRY = {
  // Accounting
  trial_balance: { name: 'Trial Balance', module: 'accounting' },
  ledger_detail: { name: 'Ledger Detail', module: 'accounting' },

  // GST
  gstr1_summary: { name: 'GSTR-1 Summary', module: 'gst' },
  gstr2b_reconciliation: { name: 'GSTR-2B Reconciliation', module: 'gst' },
  gstr3b_summary: { name: 'GSTR-3B Summary', module: 'gst' },

  // TDS
  tds_deducted_summary: { name: 'TDS Deducted Summary', module: 'tds' },
  tds_26as_reconciliation: { name: '26AS Reconciliation', module: 'tds' },

  // Financial Statements
  profit_loss_actual: { name: 'P&L — Actual', module: 'financials' },
  profit_loss_provisional: { name: 'P&L — Provisional', module: 'financials' },
  profit_loss_projected: { name: 'P&L — Projected', module: 'financials' },
  balance_sheet: { name: 'Balance Sheet (Schedule III)', module: 'financials' },
  cash_flow_direct: { name: 'Cash Flow — Direct Method', module: 'financials' },
  cash_flow_indirect: { name: 'Cash Flow — Indirect Method', module: 'financials' },

  // Operations
  debtors_aging: { name: 'Debtors Aging', module: 'operations' },
  creditors_aging: { name: 'Creditors Aging', module: 'operations' },
  depreciation_schedule: { name: 'Depreciation Schedule', module: 'assets' },
  payroll_summary: { name: 'Payroll Summary', module: 'payroll' },
  attendance_summary: { name: 'Attendance Summary', module: 'payroll' },
} as const;

export type ReportKey = keyof typeof REPORT_REGISTRY;
```

### 10.3 Access Check Flow

```
User navigates to a report page
  -> Next.js middleware decodes JWT
  -> Checks user role has module access
  -> Calls /api/reports/check-access?report=balance_sheet
  -> API queries tenant_report_permissions for tenant_id + report_key
  -> If is_enabled = false: returns 403 with "Report not available on your plan"
  -> If is_enabled = true: proceeds to render report
```

### 10.4 Admin Panel — Report Toggle

The super-admin panel (internal, developer-only) provides a table view of all tenants with their report permission matrix. Toggles enable/disable individual reports per tenant. Every toggle is recorded in `tenant_report_permissions` with `enabled_by` and `enabled_at`.

---

## 11. API Architecture

### 11.1 Pattern: Backend-for-Frontend (BFF)

Next.js API routes serve as the BFF layer. The frontend never calls Supabase directly with the service role key. All mutations go through API routes that:

1. Validate the JWT (Supabase middleware helper)
2. Validate input (Zod)
3. Check role permissions
4. Execute the database operation
5. Log to audit_log
6. Return typed response

### 11.2 Route Structure

```
/api/
  auth/
    login
    logout
    refresh
  tenants/                     -- Super-admin only
    [id]/
      users
      permissions
      reports
  accounting/
    journal-entries/
    ledger/
    trial-balance/
  invoices/
    sales/
    purchases/
  gst/
    returns/
    reconciliation/
  tds/
    entries/
    reconciliation/
  payroll/
    runs/
    attendance/
  reports/
    check-access
    [report-key]/
  exports/
    tally
    busy
    zoho
  admin/                       -- Super-admin panel routes
```

### 11.3 Error Handling Standard

Every API route returns structured errors. Silent failures are forbidden per the engineering principles.

```typescript
// Standard error response shape
type ApiError = {
  error: {
    code: string;           // Machine-readable: 'TENANT_SUSPENDED', 'REPORT_LOCKED'
    message: string;        // Human-readable
    details?: unknown;      // Validation errors, etc.
  };
  requestId: string;        // For Sentry correlation
};
```

All external calls (Supabase, Razorpay, GSTN portal APIs) are wrapped in try/catch with structured logging to Sentry, including tenant context.

---

## 12. File Storage & Invoice Customization

### 12.1 Supabase Storage Bucket Structure

```
/tenants/
  {tenant_id}/
    /logos/
      company-logo.png
    /attachments/
      {invoice_id}/
        document.pdf
    /statements/
      {bank_account_id}/
        {period}.csv
    /gst-uploads/
      {period}/
        gstr2b.json
    /payslips/
      {payroll_run_id}/
        {employee_id}.pdf
    /exports/
      {timestamp}/
        tally-export.xml
```

Storage bucket policies enforce tenant isolation: a user can only access paths prefixed with their `tenant_id`.

### 12.2 Invoice Customization

Each tenant can configure up to 5 invoice templates. Each template includes:

- Company logo (uploaded to Supabase Storage)
- Company name, address, GSTIN, CIN, PAN
- Color scheme (primary color, accent color)
- Custom columns (e.g., "PO Number", "Contract Reference")
- Footer text (bank details, terms and conditions, signature block)
- Watermark option (e.g., "ORIGINAL", "DUPLICATE")

**PDF Generation:** Invoices are rendered as React components using `@react-pdf/renderer` in a Vercel serverless function. The template data is fetched from `invoice_templates`, merged with invoice data, and rendered to PDF. The PDF is stored in Supabase Storage and a signed URL is returned for download or email attachment.

---

## 13. Export & Integration Layer

### 13.1 Tally Export

Tally Prime accepts XML in its proprietary schema. The export generates `TALLYMESSAGE` XML containing:

- Masters: ledgers (mapped from chart of accounts), parties
- Vouchers: sales, purchase, payment, receipt, journal entries

Date range and financial year scoping applied. Large exports (>10,000 entries) are processed as background Inngest jobs.

### 13.2 Busy Export

Busy Accounting Software accepts CSV imports for:
- Account Masters
- Party Masters  
- Sales and Purchase vouchers
- Journal vouchers

The export respects Busy's column header format exactly.

### 13.3 Zoho Books Export

Zoho Books supports CSV import for:
- Contacts (parties)
- Invoices
- Bills
- Manual journals

The export maps ONK Solution's data model to Zoho's import template columns.

### 13.4 Export Job Flow

```
User requests export (date range, type, format)
  -> API validates request and enqueues Inngest job
  -> Job processes data in batches of 1000 records
  -> Generates file and uploads to /exports/ in Supabase Storage
  -> Sends email via Resend with signed download URL (24-hour expiry)
  -> User notified in-app and by email
```

---

## 14. Infrastructure & DevOps

### 14.1 Environments

| Environment | Frontend | Backend | Purpose |
|---|---|---|---|
| Development | localhost:3000 | Supabase local (Docker) | Local development |
| Staging | staging.onksolution.com (Vercel) | Supabase staging project | QA and client demos |
| Production | app.onksolution.com (Vercel) | Supabase production project | Live clients |

Each environment has its own Supabase project and its own set of environment variables. `.env.example` is committed; `.env.local` / `.env.production` are gitignored.

### 14.2 CI/CD Pipeline

```
GitHub PR opened
  -> GitHub Actions: run Vitest unit tests
  -> GitHub Actions: run Playwright E2E tests (critical flows)
  -> Vercel: preview deployment created
  -> PR review and approval

Merge to main
  -> Vercel: production deployment (automatic)
  -> GitHub Actions: run Supabase migrations on production DB
  -> Sentry: new release tagged
```

### 14.3 Database Migrations

All schema changes go through Supabase migrations (`supabase/migrations/`). Migrations are:

- Versioned and committed to the repository
- Reviewed in PR before merging
- Applied via `supabase db push` in the CI/CD pipeline
- Never applied manually in production

### 14.4 Environment Variables

```bash
# .env.example (committed — no real values)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
INNGEST_SIGNING_KEY=your-inngest-key
INNGEST_EVENT_KEY=your-inngest-event-key
RESEND_API_KEY=your-resend-key
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
SENTRY_DSN=https://your-sentry-dsn
ADMIN_SECRET_TOKEN=your-admin-panel-token
```

---

## 15. Indian Regulatory Compliance

### 15.1 GST Compliance

| Requirement | Implementation |
|---|---|
| GSTIN validation | Checksum algorithm validates GSTIN format (15-digit alphanumeric) |
| HSN/SAC codes | Mandatory on invoices above ₹5 lakh turnover; system prompts if missing |
| E-invoice (IRN) | For tenants with turnover >₹5 crore, integration with IRP (Invoice Registration Portal) via NIC API — Phase 2 feature |
| E-way bill | For freight clients, e-way bill generation API integration — Phase 2 feature |
| Reverse Charge | RCM flag on purchase invoices; auto-creates liability entry |
| Composite scheme | GST regime flag per tenant; disables ITC modules for composite dealers |

### 15.2 TDS Compliance

| Requirement | Implementation |
|---|---|
| Section-wise rates | Configurable TDS rate table per section (194C, 194J, 194I, 192, etc.) |
| Higher rate for non-PAN | Automatic 20% TDS rate when party PAN is absent |
| Threshold tracking | Per-party, per-section threshold tracking to determine when TDS triggers |
| Form 16/16A | PDF generation in prescribed format |
| Traces integration | Data export in Traces-compatible format for return filing — Phase 2 |

### 15.3 Companies Act & ICAI

| Requirement | Implementation |
|---|---|
| Schedule III Balance Sheet | Account type mapping in Chart of Accounts drives automatic grouping |
| Schedule III P&L | Same mapping for income statement |
| Accounting Standards | AS 1–29 and Ind AS support via proper accounting treatment in modules |
| Depreciation | Dual books per Schedule II (Companies Act) and Income Tax Act 2025 |
| Director's Report data | Dashboard provides the financial summary data used in Director's Report |

### 15.4 Payroll Compliance

| Requirement | Implementation |
|---|---|
| PF | 12% employee + 12% employer on Basic + DA; wage ceiling ₹15,000 (configurably overridable) |
| ESI | 0.75% employee + 3.25% employer; wage ceiling ₹21,000 |
| Professional Tax | State-wise slab tables (configurable per tenant's state) |
| Minimum Wage | Configurable minimum wage check per state per skill category |
| Gratuity | Provision calculation per Payment of Gratuity Act (15/26 × last salary × years) |
| Bonus | Statutory bonus calculation per Payment of Bonus Act — Phase 2 |

### 15.5 Data Localisation

Financial data storage in ap-south-1 (Mumbai) region on Supabase. All data processed within Indian infrastructure to the extent Supabase supports this. No financial data transmitted to third-party analytics services — PostHog used only for product usage telemetry (page views, feature clicks) with financial data explicitly excluded from event payloads.

---

## 16. Phased Build Roadmap

### Phase 1 — Foundation (Weeks 1–8)

**Goal:** Core accounting engine working end-to-end for one tenant.

- [ ] Supabase project setup (production + staging)
- [ ] Next.js project scaffold with shadcn/ui and Tailwind
- [ ] Authentication: login, logout, JWT with tenant claims
- [ ] Multi-tenancy: tenant provisioning, RLS policies on all tables
- [ ] Chart of Accounts: CRUD, Schedule III mapping
- [ ] Journal Entry: double-entry, validation trigger, posting
- [ ] Parties: customers and vendors CRUD
- [ ] Sales Invoices: creation, GST calculation, PDF generation
- [ ] Purchase Invoices: creation, ITC tracking
- [ ] Trial Balance: real-time from journal entries
- [ ] Ledger view: per-account with running balance
- [ ] Audit log: triggers on all financial tables
- [ ] Report access control: infrastructure and admin toggle panel
- [ ] CI/CD: GitHub Actions + Vercel pipeline

**Deliverable:** Working accounting system for one tenant; developer can add tenants manually.

### Phase 2 — Compliance Modules (Weeks 9–16)

**Goal:** GST, TDS, Bank Reconciliation, and Cash Management live.

- [ ] GST Reconciliation: GSTR-2B upload, matching engine, mismatch report
- [ ] GSTR-1: preparation and JSON export
- [ ] TDS: entry tracking, 26AS upload, reconciliation
- [ ] Bank Accounts: CRUD, statement upload, auto-matching
- [ ] Bank Reconciliation: formal statement, outstanding items
- [ ] Cash Management: cash book, vouchers, daily balance
- [ ] Expense vouchers and receipt/payment vouchers
- [ ] Subscription enforcement: plan checks, module flags
- [ ] Razorpay billing integration

**Deliverable:** Compliance-ready accounting platform; first paying clients can be onboarded.

### Phase 3 — Financial Reporting (Weeks 17–22)

**Goal:** Full financial statements and management reporting.

- [ ] Profit & Loss: actual, provisional, projected
- [ ] Balance Sheet: Schedule III auto-assembled
- [ ] Cash Flow: direct and indirect methods
- [ ] Depreciation: dual books, schedule, journal auto-posting
- [ ] Debtors & Creditors: aging summary and detail
- [ ] Loans & Advances: full lifecycle tracking
- [ ] Export: Tally, Busy, Zoho (background job + email)
- [ ] Report access control: per-report toggle in admin panel live

**Deliverable:** Full financial reporting suite; platform is feature-complete for non-payroll clients.

### Phase 4 — Payroll & Operations (Weeks 23–30)

**Goal:** Attendance, payroll, and manpower invoicing for agency clients.

- [ ] Employee master with statutory fields
- [ ] Attendance: daily entry, bulk Excel import, monthly sheet
- [ ] Payroll: calculation engine with all deductions
- [ ] Payslip: branded PDF generation and email
- [ ] Statutory: PF, ESI, Professional Tax calculations
- [ ] Client invoicing from attendance/payroll data
- [ ] Management dashboard: all widgets with filters
- [ ] Invoice templates: logo upload, branded PDF

**Deliverable:** Full platform; all target industry segments served.

### Phase 5 — Advanced & Scale (Weeks 31–40)

**Goal:** Advanced integrations and scale hardening.

- [ ] E-invoice (IRN) integration with IRP/NIC API
- [ ] E-way bill generation for freight clients
- [ ] Traces-compatible TDS return data export
- [ ] Performance: query optimization, report caching with Upstash Redis
- [ ] Multi-language support (Hindi UI — Phase 5 target)
- [ ] Mobile-responsive audit (ensure all modules work on tablet)
- [ ] Bulk tenant onboarding tooling for developer
- [ ] SLA monitoring and uptime dashboard
- [ ] Penetration testing and security audit

---

## 17. Key Technical Decisions & Rationale

### 17.1 Supabase over Firebase or custom Postgres

Supabase provides PostgreSQL with Row Level Security — the only correct tool for multi-tenant financial data isolation without per-tenant databases. Firebase's NoSQL model is fundamentally incompatible with double-entry accounting which requires relational integrity, foreign key constraints, and transactional ACID guarantees. A custom PostgreSQL setup would require managing a server, backups, and connection pooling — unnecessary overhead for a product at this stage.

### 17.2 Next.js App Router over a separate backend

A separate Express or NestJS backend adds a service to deploy and maintain. Next.js API routes provide the same BFF capability with zero additional infrastructure. The API routes run on Vercel's serverless functions. For computationally heavy operations (payroll, exports), Inngest workers handle the load asynchronously. If the business scales to a point where API routes become a bottleneck, extracting them to a dedicated service is straightforward.

### 17.3 numeric(18,2) over float for money

IEEE 754 floating point cannot represent 0.1 exactly. In financial software, `0.1 + 0.2 ≠ 0.3` in floating point arithmetic. All monetary values use PostgreSQL's `numeric` type which is arbitrary-precision decimal. This is non-negotiable for any accounting system. JavaScript's `number` type is also floating point — all monetary arithmetic on the server uses the `decimal.js` library which mirrors PostgreSQL's precision.

### 17.4 Immutable journal entries

Once a journal entry is posted, it cannot be edited or deleted. Corrections are made via reversal entries. This mirrors how physical ledger books work and satisfies audit requirements under the Companies Act and Income Tax Act. Any system that allows editing posted entries is fundamentally insecure for financial use.

### 17.5 Developer-controlled report visibility

This is a deliberate commercial and operational decision. It prevents clients from accessing reports they have not been licensed for, trained on, or cleared to see. It also provides a support mechanism — the developer can disable a report if a client is encountering issues with it. The trade-off is that onboarding requires a manual step, but for a professional financial product targeting the Indian SMB market, this control is an asset, not a liability.

### 17.6 Inngest for background jobs over Supabase Edge Functions

Supabase Edge Functions have a 150-second timeout and are stateless. Payroll processing for 500 employees, GST matching for 10,000 invoices, and Tally exports for a full financial year all exceed this limit. Inngest provides durable, retryable job execution with progress tracking and failure handling. It integrates with Next.js via a single API route and requires no additional infrastructure.

### 17.7 Dual depreciation books

Indian businesses are legally required to maintain depreciation per the Companies Act for their financial statements AND per the Income Tax Act for their tax returns. These rates differ. A single depreciation book forces manual reconciliation. Maintaining both books in the system eliminates this reconciliation work and produces the deferred tax calculation automatically.

---

## 18. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Supabase RLS misconfiguration causing tenant data leak | Low | Critical | RLS policy unit tests; penetration test before production; code review checklist |
| GST portal API changes breaking GSTR-1 JSON format | Medium | High | GST return format versioned; parser isolated; GSTN changelog monitoring |
| PostgreSQL floating point rounding in reports | Low | High | `numeric(18,2)` enforced; linting rule blocks `float`/`number` for monetary fields |
| Supabase service outage | Low | High | Supabase SLA 99.9% on Pro+; read-only mode graceful degradation; PITR backups |
| Client deletes critical financial data | Medium | High | Soft-delete on all financial records; audit log; 30-day recovery window |
| Payroll calculation errors causing incorrect salaries | Low | Critical | Unit tests on payroll engine covering all statutory deduction edge cases; maker-checker approval flow |
| JWT tenant_id claim tampering | Very Low | Critical | Claim set server-side via Supabase Auth Hook; RLS double-checks at DB level |
| Subscription bypass (accessing locked modules) | Low | Medium | Middleware + API route + module flag in DB; three independent checks |
| Large export job timing out | Medium | Low | Inngest background processing; chunked exports; email notification on completion |
| GSTIN / PAN data breach | Low | Critical | Encryption at rest (Supabase default AES-256); field-level masking in logs; Aadhaar stored as last-4 only |

---

*This document governs all architecture and development decisions for ONK Solution. Any deviation from the decisions in this document requires explicit review and approval, with the rationale recorded as a decision log entry in the repository.*

*Document Owner: ONK Solution Development Team*  
*Next Review: Upon completion of Phase 1 — Foundation*
