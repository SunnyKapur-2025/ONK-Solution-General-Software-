'use client'

import { useState } from 'react'

const FAQS = [
  { q: 'How do I add a new ledger account?', a: 'Go to Ledger Creation in the sidebar → choose the Tally-compatible group (e.g. Sundry Debtors, Bank Accounts) → fill in the name and opening balance → Save.' },
  { q: 'How do I record a sale with GST?', a: 'Go to Sales → New Sale. Select the customer, add line items with HSN/SAC code, choose the GST rate and tax type (CGST+SGST for intra-state, IGST for inter-state). Save — a balanced journal entry is posted automatically.' },
  { q: 'Can I export to Tally or Busy?', a: 'Yes — click "Export to Tally / Busy" in the top bar. Export journal vouchers (XML) or ledger masters (Chart of Accounts) for TallyPrime or Busy Accounting.' },
  { q: 'How do I collapse the sidebar?', a: 'Click the « button at the top of the sidebar, or press Ctrl+\\ to toggle it to icon-only mode for more screen space.' },
  { q: 'What is Power Mode?', a: 'Power Mode is Tally-style keyboard-first data entry. Press Ctrl+M to toggle it. Use F4–F9 to switch voucher types and Tab/Enter to navigate fields. Ctrl+A saves the entry.' },
  { q: 'How do I upload a bank statement?', a: 'Go to Bank → Upload Statement. Drag & drop a CSV file (HDFC/ICICI/SBI auto-detected) or a text-based PDF. For PDFs, click "Parse PDF & Extract Transactions". Image-only scanned PDFs won\'t work — download a text-based statement from your net banking portal.' },
  { q: 'How do I add a new user?', a: 'Go to Users & Rights → Add User. Enter their name, email, a temporary password, and role. They can log in immediately and change the password via Settings.' },
  { q: 'How do I create a new client company?', a: 'Only owners/superadmins see "Client Accounts" in the sidebar. Go there → New Client. Fill in company details, industry, and the owner\'s login credentials.' },
  { q: 'How do I personalise invoices with my logo?', a: 'Go to Settings → Invoice. Upload your logo, seal image, and authorized signature. Enter your bank details and footer text. Click Preview Invoice to check before saving.' },
  { q: 'What TDS sections are available?', a: 'The TDS Centre has all sections under Finance Act 2025 — including new 194T (partner payments), 194S (VDA/crypto), and revised rates for 194D, 194H, 194I, 194J, and 194O. Use the built-in calculator to compute TDS on any payment.' },
]

const SHORTCUTS = [
  { key: 'Ctrl+M',    action: 'Toggle Power Mode (keyboard-first entry)' },
  { key: 'Ctrl+N',    action: 'Open new voucher' },
  { key: 'Ctrl+\\',   action: 'Collapse / expand sidebar' },
  { key: 'Alt+1…9',   action: 'Jump to 1st–9th module tab' },
  { key: 'F4',        action: 'Contra voucher' },
  { key: 'F5',        action: 'Payment voucher' },
  { key: 'F6',        action: 'Receipt voucher' },
  { key: 'F7',        action: 'Journal voucher' },
  { key: 'F8',        action: 'Sales voucher' },
  { key: 'F9',        action: 'Purchase voucher' },
  { key: 'Tab/Enter', action: 'Move between fields (Power Mode)' },
  { key: 'Ctrl+A',    action: 'Save / Accept entry' },
  { key: 'Escape',    action: 'Cancel / reset current entry' },
]

const HOW_IT_WORKS = [
  {
    phase: 'Setup (Do once)',
    color: 'bg-blue-600',
    steps: [
      {
        n: 1,
        title: 'Create Ledger Accounts (Chart of Accounts)',
        detail: [
          'Go to Ledger Creation in the sidebar.',
          'For each account, choose a Tally-compatible group: e.g. Bank Accounts for your bank, Sundry Debtors for customers, Sundry Creditors for vendors, Direct Expenses for operating costs.',
          'Enter an opening balance (Dr or Cr) if you are migrating from another system.',
          'Save. Repeat for all accounts.',
          'Tip: The group you choose determines where the account appears in P&L and Balance Sheet automatically.',
        ],
      },
      {
        n: 2,
        title: 'Add Parties (Customers & Vendors)',
        detail: [
          'Parties are created as ledger accounts too — under group Sundry Debtors (customers) or Sundry Creditors (vendors).',
          'Include GSTIN and PAN while creating the ledger for GST and TDS compliance.',
        ],
      },
      {
        n: 3,
        title: 'Personalise Your Invoice',
        detail: [
          'Go to Settings → Invoice tab.',
          'Upload your company logo, rubber seal image, and authorized signature (PNG/JPG).',
          'Enter your company bank details, footer text, and terms & conditions.',
          'Choose invoice title: Tax Invoice / Proforma / Service Invoice.',
          'Click Preview Invoice to verify before saving.',
        ],
      },
      {
        n: 4,
        title: 'Configure Users & Rights',
        detail: [
          'Go to Users & Rights → Add User.',
          'Enter name, email, temporary password, and role (Owner / Accountant / Manager / Staff).',
          'Staff and Manager roles have restricted access; Accountant has full accounting access; Owner can create sub-tenants.',
          'Users can change their password via Settings after first login.',
        ],
      },
    ],
  },
  {
    phase: 'Daily Operations',
    color: 'bg-green-600',
    steps: [
      {
        n: 5,
        title: 'Record Sales & Raise Invoices',
        detail: [
          'Go to Sales → New Sale or Invoices → New Invoice.',
          'Select the customer (from your Sundry Debtors ledger), enter line items with amount, HSN/SAC code, and GST rate.',
          'The system calculates CGST+SGST (intra-state) or IGST (inter-state) and posts a balanced journal entry automatically.',
          'Print or download the invoice as PDF. Your logo and signature appear if configured in Settings.',
        ],
      },
      {
        n: 6,
        title: 'Record Purchases & Expenses',
        detail: [
          'Go to Purchases → New Purchase. Enter vendor, bill number, date, items, and GST.',
          'For routine expenses (rent, travel, utilities), go to Expenses → New Expense. Choose the expense head and payment mode (bank/cash).',
          'Input GST is captured and flows into the GST Centre automatically.',
        ],
      },
      {
        n: 7,
        title: 'Record Payments & Receipts',
        detail: [
          'Payments: Go to Payments → New Payment. Select the vendor/creditor, amount, bank/cash account. Marks the creditor as partially/fully paid.',
          'Receipts: Go to Receipts → New Receipt. Select the customer/debtor, amount received, and deposit account.',
          'Both auto-post journal entries (double-entry, always balanced).',
        ],
      },
      {
        n: 8,
        title: 'Use Power Mode for Fast Entry (Optional)',
        detail: [
          'Press Ctrl+M or click "Power Mode" in the sidebar footer.',
          'Press F8 for Sales, F9 for Purchase, F5 for Payment, F6 for Receipt, F4 for Contra, F7 for Journal.',
          'Tab/Enter navigates fields. Type an account name to search. Ctrl+A saves the entry. Escape cancels.',
          'This mirrors Tally data entry — ideal for accountants entering large volumes.',
        ],
      },
      {
        n: 9,
        title: 'Bank Reconciliation',
        detail: [
          'Go to Bank → Upload Statement.',
          'Download your bank statement from net banking as CSV (preferred) or PDF.',
          'Drag-and-drop or click to upload. CSV is auto-detected (HDFC/ICICI/SBI/Axis/Kotak).',
          'For PDF, click "Parse PDF & Extract Transactions". Review the extracted rows and click Import.',
          'Go to the Reconcile tab to match bank transactions against your books side-by-side.',
        ],
      },
    ],
  },
  {
    phase: 'Compliance & Reporting',
    color: 'bg-purple-600',
    steps: [
      {
        n: 10,
        title: 'GST Filing',
        detail: [
          'Go to GST Centre. The summary shows Output Tax (collected from customers) vs Input Tax (paid on purchases) month-wise.',
          'Enter your GSTIN in the GST portal connect panel to get personalised links to GSTR-1, GSTR-3B, GSTR-2B.',
          'Download GSTR-2B JSON from the portal and upload it here to reconcile ITC against your books.',
          'File returns directly on the government GST portal — ONK links you there with one click.',
        ],
      },
      {
        n: 11,
        title: 'TDS Compliance',
        detail: [
          'Go to TDS Centre. All sections from Finance Act 2025 are listed (194J, 194C, 194I, 194T etc.) with current rates and thresholds.',
          'Use the TDS Calculator: select a section, enter the gross amount — TDS and net payable are shown instantly.',
          'Add TDS entries as you make payments. The register tracks deductions by month and section.',
          'Pay challan by 7th of the following month. File quarterly returns (24Q for salary, 26Q for others).',
        ],
      },
      {
        n: 12,
        title: 'View Reports',
        detail: [
          'Day Book: All transactions in date order — go to Day Book in the sidebar.',
          'P&L (Profit & Loss): Go to P&L → select date range. Shows gross profit, operating profit, and net profit.',
          'Balance Sheet: Go to Balance Sheet → select date. Shows Schedule III format (Companies Act 2013) — Equity & Liabilities | Assets.',
          'Debtors/Creditors Aging: Shows who owes you money and for how long (0–30, 31–60, 61–90, 90+ days).',
        ],
      },
      {
        n: 13,
        title: 'Export to Tally or Busy',
        detail: [
          'Click "Export to Tally / Busy" in the top navigation bar.',
          'Voucher Export: Choose date range → select format (Tally XML or Busy CSV) → Download.',
          'Ledger Master Export: Check accounts to export → Download as TallyPrime XML or Busy CSV.',
          'Import the file into TallyPrime: Gateway of Tally → Import → Masters/Vouchers.',
          'Import into Busy: Administration → Import Data → select the CSV file.',
        ],
      },
    ],
  },
]

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [openStep, setOpenStep] = useState<number | null>(null)

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Help &amp; Support</h1>
        <p className="text-slate-500 text-sm mt-0.5">Step-by-step guide, keyboard shortcuts, and contact</p>
      </div>

      {/* How the Software Works */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">How ONK Solutions Works — Step by Step</h2>
        <div className="space-y-6">
          {HOW_IT_WORKS.map(({ phase, color, steps }) => (
            <div key={phase} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className={`px-6 py-3 ${color}`}>
                <p className="text-white font-semibold text-sm">{phase}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {steps.map(({ n, title, detail }) => (
                  <div key={n}>
                    <button
                      onClick={() => setOpenStep(openStep === n ? null : n)}
                      className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className={`w-7 h-7 rounded-full ${color} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                        {n}
                      </div>
                      <span className="text-sm font-medium text-slate-800 flex-1">{title}</span>
                      <span className="text-slate-400 text-lg leading-none">{openStep === n ? '−' : '+'}</span>
                    </button>
                    {openStep === n && (
                      <div className="px-6 pb-4 ml-11">
                        <ol className="space-y-1.5 list-decimal list-inside">
                          {detail.map((d, i) => (
                            <li key={i} className="text-sm text-slate-600 leading-relaxed">{d}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Keyboard Shortcuts</h2>
          <p className="text-xs text-slate-500 mt-0.5">No mouse needed — full keyboard navigation</p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-slate-100">
          {SHORTCUTS.map(({ key, action }) => (
            <div key={key} className="flex items-center gap-3 bg-white px-5 py-3">
              <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono text-slate-700 whitespace-nowrap">
                {key}
              </kbd>
              <span className="text-sm text-slate-600">{action}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-medium text-slate-800">{faq.q}</span>
                <span className="text-slate-400 text-lg leading-none">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact + About */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-green-50">
          <h2 className="font-semibold text-green-900">Contact Support</h2>
        </div>
        <div className="p-6 grid grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Phone / WhatsApp</p>
            <a href="tel:+919910429943" className="text-sm text-blue-700 font-medium hover:underline">+91 99104 29943</a>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Email</p>
            <a href="mailto:sunnyk28@hotmail.com" className="text-sm text-blue-700 font-medium hover:underline">sunnyk28@hotmail.com</a>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Hours</p>
            <p className="text-sm text-slate-700 font-medium">Mon–Sat, 9am–6pm IST</p>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="bg-slate-900 rounded-xl overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base"><span className="text-blue-400">ONK</span> Solutions — General Software</p>
            <p className="text-slate-400 text-xs mt-1">Cloud accounting for the Indian service industry</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">Designed &amp; Developed by</p>
            <p className="text-white font-semibold text-sm mt-0.5">Sunny Kapoor</p>
            <a href="tel:+919910429943" className="text-blue-400 text-xs hover:text-blue-300">+91 99104 29943</a>
            <span className="text-slate-600 text-xs mx-1">·</span>
            <a href="mailto:sunnyk28@hotmail.com" className="text-blue-400 text-xs hover:text-blue-300">sunnyk28@hotmail.com</a>
          </div>
        </div>
      </section>
    </div>
  )
}
