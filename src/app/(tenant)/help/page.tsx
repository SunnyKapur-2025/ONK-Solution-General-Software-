'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'How do I add a new ledger account?',
    a: 'Go to Accounts in the sidebar, click "New Account", fill in the account name, type (Asset/Liability/Income/Expense), and code. Save to create it.',
  },
  {
    q: 'How do I record a sale with GST?',
    a: 'Use the Sales module or create an invoice from the Invoices page. Select the GST rate and whether it is intra-state (CGST+SGST) or inter-state (IGST). The system auto-posts the journal entry.',
  },
  {
    q: 'Can I export data to Tally or Busy?',
    a: 'Yes — go to Reports → Export to Tally/Busy. You can export journal entries in XML format compatible with Tally Prime and Busy Accounting.',
  },
  {
    q: 'How do I view all transactions for a particular party?',
    a: 'Use the Day Book report and filter by party name, or go to the Debtors/Creditors Aging report to see outstanding balances per party.',
  },
  {
    q: 'What does "Power Mode" do?',
    a: 'Power Mode (Ctrl+M) enables keyboard-first data entry similar to traditional accounting software. Use F4–F9 to open voucher types and Tab/Enter to navigate fields quickly.',
  },
  {
    q: 'How is the financial year determined?',
    a: 'The system uses the Indian financial year (April 1 – March 31). All reports default to the current FY. You can change the date range manually in any report.',
  },
]

const SHORTCUTS = [
  { key: 'Ctrl+M', action: 'Toggle Power Mode' },
  { key: 'Ctrl+N', action: 'New Voucher' },
  { key: 'F4', action: 'Open Sales Voucher' },
  { key: 'F5', action: 'Open Purchase Voucher' },
  { key: 'F6', action: 'Open Receipt Voucher' },
  { key: 'F7', action: 'Open Payment Voucher' },
  { key: 'F8', action: 'Open Journal Voucher' },
  { key: 'F9', action: 'Open Contra Voucher' },
  { key: 'Tab / Enter', action: 'Navigate between fields' },
  { key: 'Ctrl+A', action: 'Save / Accept entry' },
]

const STEPS = [
  { step: 1, title: 'Create Ledger Accounts', desc: 'Set up your chart of accounts — assets, liabilities, income, and expense heads.' },
  { step: 2, title: 'Add Parties', desc: 'Add customers and suppliers as party accounts under Debtors or Creditors.' },
  { step: 3, title: 'Record Your First Sale', desc: 'Go to Invoices, click "New Invoice", fill in customer, amount, GST, and submit.' },
  { step: 4, title: 'View Day Book', desc: 'Go to Reports → Day Book to see all transactions posted for a date range.' },
  { step: 5, title: 'Export to Tally', desc: 'Go to Reports → Export to Tally/Busy to export entries for your CA or tax filing.' },
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
          <p className="text-xs text-blue-700 mt-0.5">Follow these 5 steps to be up and running</p>
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
          <p className="text-xs text-slate-500 mt-0.5">Speed up your data entry</p>
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

      {/* Video Tutorials */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Video Tutorials</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 p-6">
          {['Getting Started', 'GST Filing', 'Tally Export'].map((title) => (
            <div key={title} className="bg-slate-100 rounded-xl aspect-video flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-500 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 font-medium">{title}</p>
              <p className="text-xs text-slate-400">Coming soon</p>
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
            <p className="text-xs font-medium text-slate-500 mb-1">Email</p>
            <a href="mailto:support@onksolutions.in" className="text-sm text-blue-700 font-medium hover:underline">
              support@onksolutions.in
            </a>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">WhatsApp</p>
            <a
              href="https://wa.me/91XXXXXXXXXX"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-700 font-medium hover:underline"
            >
              Message us on WhatsApp
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
    </div>
  )
}
