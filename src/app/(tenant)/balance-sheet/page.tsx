'use client'

import PnLReportPage from '@/components/reports/PnLReport'

export default function BalanceSheetPage() {
  return (
    <div>
      <div className="max-w-4xl mx-auto px-6 pt-8">
        <h1 className="text-2xl font-bold text-slate-900">Balance Sheet</h1>
        <p className="text-slate-500 text-sm mt-0.5 mb-6">Assets, liabilities and equity — financial position of your business</p>
      </div>
      <PnLReportPage />
    </div>
  )
}
