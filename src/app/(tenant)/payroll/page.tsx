'use client'

export default function PayrollPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Payroll</h1>
        <button
          onClick={() => alert('Coming soon')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Employee
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Employee Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Designation</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Basic Salary</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">HRA</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Other Allow.</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Gross</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">PF</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">ESI</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">TDS</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Net Pay</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Month</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-slate-400">
                  No payroll records yet. Add employees to get started.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400 text-center">
        Payroll module integration with journal entries coming soon
      </p>
    </div>
  )
}
