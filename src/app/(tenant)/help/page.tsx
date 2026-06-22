'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'How do I add a new ledger account?',
    a: 'Go to Ledger Creation in the sidebar, choose the Tally-compatible group (e.g. Sundry Debtors, Bank Accounts), fill in the name and opening balance. Save to create it.',
  },
  {
    q: 'How do I record a sale with GST?',
    a: 'Use the Sales module or create an invoice from the Invoices page. Select the GST rate and whether it is intra-state (CGST+SGST) or inter-state (IGST). The system auto-posts the balanced journal entry.',
  },
  {
    q: 'Can I export data to Tally or Busy?',
    a: 'Yes — go to "Export to Tally / Busy" from the top bar. You can export both journal vouchers (XML) and ledger masters (Chart of Accounts) for Tally Prime or Busy Accounting.',
  },
  {
    q: 'How do I view all transactions for a party?',
    a: 'Use the Day Book and filter by party name, or check the Debtors/Creditors Aging report for outstanding balances per party.',
  },
  {
    q: 'What does Power Mode do?',
    a: 'Power Mode (Ctrl+M) enables keyboard-first Tally-style data entry. Use F4–F9 to switch voucher types and Tab/Enter to navigate fields. Ctrl+A saves/accepts the entry.',
  },
  {
    q: 'How is the financial year determined?',
    a: 'The system uses the Indian financial year (April 1 – March 31). All reports default to the current FY. You can change the date range manually on any report.',
  },
  {
    q: 'How do I collapse the sidebar?',
    a: 'Click the « / » arrow button at the top-right of the sidebar, or press Ctrl+\\ to toggle it. The sidebar collapses to an icon-only strip for more screen space.',
  },
  {
    q: 'What TDS sections are available?',
    a: 'The TDS Centre covers all sections under the Finance Act 2025 / New Income Tax Bill 2025, including the new 194T (partner payments), 194S (VDA/crypto), and updated rates for 194D, 194H, 194I, 194J, and 194O.',
  },
]

const SHORTCUTS = [
  { key: 'Ctrl+M',   action: 'Toggle Power Mode (keyboard-first entry)' },
  { key: 'Ctrl+N',   action: 'Open new voucher' },
  { key: 'Ctrl+\\',  action: 'Collapse / expand sidebar' },
  { key: 'Alt+1…9',  action: 'Jump to 1st–9th module tab' },
  { key: 'F4',       action: 'Switch to Contra voucher' },
  { key: 'F5',       action: 'Switch to Payment voucher' },
  { key: 'F6',       action: 'Switch to Receipt voucher' },
  { key: 'F7',       action: 'Switch to Journal voucher' },
  { key: 'F8',       action: 'Switch to Sales voucher' },
  { key: 'F9',       action: 'Switch to Purchase voucher' },
  { key: 'Tab / Enter', action: 'Move between fields in Power Mode' },
  { key: 'Ctrl+A',   action: 'Save / Accept entry' },
  { key: 'Escape',   action: 'Cancel / reset current entry' },
]

const STEPS = [
  { step: 1, title: 'Create Ledger Accounts', desc: 'Go to Ledger Creation → choose the Tally group (e.g. Bank Accounts, Sundry Debtors) → save.' },
  { step: 2, title: 'Add Parties', desc: 'Add customers and suppliers under Sundry Debtors or Sundry Creditors group.' },
  { step: 3, title: 'Record Your First Sale', desc: 'Go to Invoices → New Invoice → fill in customer, line items, GST, and submit.' },
  { step: 4, title: 'View Day Book', desc: 'Click Day Book in the sidebar to see all posted transactions for a date range.' },
  { step: 5, title: 'Personalise Your Invoice', desc: 'Go to Settings → Invoice section to upload your logo, seal, signature, and bank details.' },
  { step: 6, title: 'Export to Tally / Busy', desc: 'Click "Export to Tally / Busy" in the top bar. Export vouchers or ledger masters in one click.' },
]

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Help &amp; Support</h1>
        <p className="text-slate-500 text-sm mt-0.5">Guides, shortcuts, and contact information</p>
      </div>

      {/* Getting Started */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-blue-50">
          <h2 className="font-semibold text-blue-900">Getting Started</h2>
          <p className="text-xs text-blue-700 mt-0.5">Follow these steps to be up and running</p>
        </div>
        <div className="divide-y divide-slate-100">
          {STEPS.map(({ step, title, desc }) => (
            <div key={step} className="flex gap-4 px-6 py-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {step}
              </div>
              <div>
                <p className="font-medium text-slate-800 text-sm">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Keyboard Shortcuts</h2>
          <p className="text-xs text-slate-500 mt-0.5">Speed up your data entry — no mouse needed</p>
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

      {/* Contact Support */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-green-50">
          <h2 className="font-semibold text-green-900">Contact Support</h2>
        </div>
        <div className="p-6 grid grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Phone / WhatsApp</p>
            <a href="tel:+919910429943" className="text-sm text-blue-700 font-medium hover:underline">
              +91 99104 29943
            </a>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Email</p>
            <a href="mailto:sunnyk28@hotmail.com" className="text-sm text-blue-700 font-medium hover:underline">
              sunnyk28@hotmail.com
            </a>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Hours</p>
            <p className="text-sm text-slate-700 font-medium">Mon–Sat, 9am–6pm IST</p>
          </div>
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

      {/* About / Credits */}
      <section className="bg-slate-900 rounded-xl overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base">
              <span className="text-blue-400">ONK</span> Solutions — General Software
            </p>
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
