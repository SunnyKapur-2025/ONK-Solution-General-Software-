'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Employee {
  id: string
  name: string
  designation: string
  department: string
  basicSalary: number
  hraPercent: number       // % of basic
  otherAllowances: number  // fixed amount
  pfApplicable: boolean
  esiApplicable: boolean
  tdsSection: '194J' | '194C' | '194A' | 'None'
  tdsRate: number          // %
  bankAccount: string
  bankName: string
  ifsc: string
  joiningDate: string
  isActive: boolean
}

interface PayslipRow {
  employee: Employee
  month: number
  year: number
  // Earnings
  basic: number
  hra: number
  otherAllowances: number
  gross: number
  // Deductions
  pfEmployee: number   // 12% of basic
  pfEmployer: number   // 12% of basic (cost to company)
  esiEmployee: number  // 0.75% of gross
  esiEmployer: number  // 3.25% of gross
  tds: number
  totalDeductions: number
  netPay: number
}

// ─── Calculation helpers ──────────────────────────────────────────────────────

function calcPayslip(emp: Employee, month: number, year: number): PayslipRow {
  const basic = emp.basicSalary
  const hra = (emp.hraPercent / 100) * basic
  const otherAllowances = emp.otherAllowances
  const gross = basic + hra + otherAllowances

  const pfEmployee = emp.pfApplicable ? Math.round(0.12 * basic) : 0
  const pfEmployer = emp.pfApplicable ? Math.round(0.12 * basic) : 0

  // ESI applicable only if gross ≤ ₹21,000
  const esiApplicableNow = emp.esiApplicable && gross <= 21000
  const esiEmployee = esiApplicableNow ? Math.round(0.0075 * gross) : 0
  const esiEmployer = esiApplicableNow ? Math.round(0.0325 * gross) : 0

  const tds = emp.tdsSection !== 'None' ? Math.round((emp.tdsRate / 100) * gross) : 0
  const totalDeductions = pfEmployee + esiEmployee + tds
  const netPay = gross - totalDeductions

  return {
    employee: emp,
    month,
    year,
    basic,
    hra,
    otherAllowances,
    gross,
    pfEmployee,
    pfEmployer,
    esiEmployee,
    esiEmployer,
    tds,
    totalDeductions,
    netPay,
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const TDS_SECTIONS = [
  { value: 'None', label: 'None' },
  { value: '194J', label: '194J – Professional / Technical (10%)' },
  { value: '194C', label: '194C – Contractor (1%/2%)' },
  { value: '194A', label: '194A – Interest (10%)' },
]

const TDS_DEFAULT_RATES: Record<string, number> = {
  None: 0,
  '194J': 10,
  '194C': 2,
  '194A': 10,
}

const STORAGE_KEY = 'onk_payroll_employees'

// ─── Empty form state ─────────────────────────────────────────────────────────

const emptyForm = (): Omit<Employee, 'id'> => ({
  name: '',
  designation: '',
  department: '',
  basicSalary: 0,
  hraPercent: 40,
  otherAllowances: 0,
  pfApplicable: true,
  esiApplicable: true,
  tdsSection: 'None',
  tdsRate: 0,
  bankAccount: '',
  bankName: '',
  ifsc: '',
  joiningDate: '',
  isActive: true,
})

// ─── Main component ───────────────────────────────────────────────────────────

export default function PayrollPage() {
  const now = new Date()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Employee, 'id'>>(emptyForm())
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [payslipRows, setPayslipRows] = useState<PayslipRow[]>([])
  const [payrollRun, setPayrollRun] = useState(false)
  const [runningPayroll, setRunningPayroll] = useState(false)

  const [selectedPayslip, setSelectedPayslip] = useState<PayslipRow | null>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setEmployees(JSON.parse(raw))
    } catch {
      // ignore
    }
  }, [])

  const saveEmployees = (list: Employee[]) => {
    setEmployees(list)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }

  // ── Form handlers ──────────────────────────────────────────────────────────

  const openAddForm = () => {
    setEditId(null)
    setForm(emptyForm())
    setFormErrors({})
    setShowForm(true)
  }

  const openEditForm = (emp: Employee) => {
    setEditId(emp.id)
    const { id: _id, ...rest } = emp
    setForm(rest)
    setFormErrors({})
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
  }

  const handleFormChange = (field: keyof Omit<Employee, 'id'>, value: unknown) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      // auto-set TDS rate when section changes
      if (field === 'tdsSection') {
        updated.tdsRate = TDS_DEFAULT_RATES[value as string] ?? 0
      }
      return updated
    })
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = 'Name is required'
    if (!form.designation.trim()) errors.designation = 'Designation is required'
    if (!form.department.trim()) errors.department = 'Department is required'
    if (!form.basicSalary || form.basicSalary <= 0) errors.basicSalary = 'Basic salary must be > 0'
    if (form.hraPercent < 0 || form.hraPercent > 100) errors.hraPercent = 'HRA % must be 0-100'
    if (!form.joiningDate) errors.joiningDate = 'Joining date is required'
    if (form.bankAccount && !form.ifsc) errors.ifsc = 'IFSC required when bank account is provided'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return
    if (editId) {
      const updated = employees.map(e => e.id === editId ? { ...form, id: editId } : e)
      saveEmployees(updated)
    } else {
      const newEmp: Employee = { ...form, id: crypto.randomUUID() }
      saveEmployees([...employees, newEmp])
    }
    closeForm()
  }

  const handleDelete = (id: string) => {
    if (!confirm('Remove this employee?')) return
    saveEmployees(employees.filter(e => e.id !== id))
    // also remove from payslip rows
    setPayslipRows(r => r.filter(p => p.employee.id !== id))
  }

  const toggleActive = (id: string) => {
    const updated = employees.map(e => e.id === id ? { ...e, isActive: !e.isActive } : e)
    saveEmployees(updated)
  }

  // ── Run payroll ────────────────────────────────────────────────────────────

  const handleRunPayroll = async () => {
    const active = employees.filter(e => e.isActive)
    if (active.length === 0) {
      alert('No active employees found.')
      return
    }
    setRunningPayroll(true)

    const rows = active.map(emp => calcPayslip(emp, selectedMonth, selectedYear))
    setPayslipRows(rows)
    setPayrollRun(true)

    // Call API route (fire-and-forget; UI stays functional even if fails)
    try {
      await fetch('/api/payroll/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          rows: rows.map(r => ({
            employeeId: r.employee.id,
            employeeName: r.employee.name,
            gross: r.gross,
            netPay: r.netPay,
            pfEmployee: r.pfEmployee,
            pfEmployer: r.pfEmployer,
            esiEmployee: r.esiEmployee,
            esiEmployer: r.esiEmployer,
            tds: r.tds,
          })),
        }),
      })
    } catch {
      // non-fatal
    }

    setRunningPayroll(false)
  }

  // ─── Totals ────────────────────────────────────────────────────────────────

  const totals = payslipRows.reduce(
    (acc, r) => ({
      gross: acc.gross + r.gross,
      pf: acc.pf + r.pfEmployee,
      esi: acc.esi + r.esiEmployee,
      tds: acc.tds + r.tds,
      net: acc.net + r.netPay,
    }),
    { gross: 0, pf: 0, esi: 0, tds: 0, net: 0 }
  )

  // ─── Payslip modal ─────────────────────────────────────────────────────────

  const PayslipModal = ({ row }: { row: PayslipRow }) => {
    const emp = row.employee
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedPayslip(null)}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Payslip</h2>
              <p className="text-sm text-slate-500">{MONTHS[row.month]} {row.year}</p>
            </div>
            <button onClick={() => setSelectedPayslip(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
          </div>

          <div className="border-b border-slate-200 pb-4 mb-4">
            <p className="font-semibold text-slate-800">{emp.name}</p>
            <p className="text-sm text-slate-500">{emp.designation} — {emp.department}</p>
            {emp.bankAccount && (
              <p className="text-xs text-slate-400 mt-1">
                {emp.bankName} | A/C: {emp.bankAccount} | IFSC: {emp.ifsc}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
            <div className="font-semibold text-slate-700 col-span-2 text-xs uppercase tracking-wide text-slate-400 mt-2">Earnings</div>
            <span className="text-slate-600">Basic Salary</span>
            <span className="text-right font-medium text-slate-800">{formatCurrency(row.basic)}</span>
            <span className="text-slate-600">HRA ({emp.hraPercent}%)</span>
            <span className="text-right font-medium text-slate-800">{formatCurrency(row.hra)}</span>
            <span className="text-slate-600">Other Allowances</span>
            <span className="text-right font-medium text-slate-800">{formatCurrency(row.otherAllowances)}</span>
            <span className="text-slate-700 font-semibold">Gross Salary</span>
            <span className="text-right font-semibold text-slate-800">{formatCurrency(row.gross)}</span>

            <div className="font-semibold text-slate-700 col-span-2 text-xs uppercase tracking-wide text-slate-400 mt-2">Deductions</div>
            {row.pfEmployee > 0 && <>
              <span className="text-slate-600">PF (Employee 12%)</span>
              <span className="text-right text-red-600">−{formatCurrency(row.pfEmployee)}</span>
            </>}
            {row.esiEmployee > 0 && <>
              <span className="text-slate-600">ESI (Employee 0.75%)</span>
              <span className="text-right text-red-600">−{formatCurrency(row.esiEmployee)}</span>
            </>}
            {row.tds > 0 && <>
              <span className="text-slate-600">TDS ({emp.tdsSection} @ {emp.tdsRate}%)</span>
              <span className="text-right text-red-600">−{formatCurrency(row.tds)}</span>
            </>}
            <span className="text-slate-700 font-semibold">Total Deductions</span>
            <span className="text-right font-semibold text-red-600">−{formatCurrency(row.totalDeductions)}</span>

            <div className="col-span-2 border-t border-slate-200 mt-2 pt-2 flex justify-between">
              <span className="font-bold text-slate-800">Net Pay (NEFT)</span>
              <span className="font-bold text-green-700 text-base">{formatCurrency(row.netPay)}</span>
            </div>

            {row.pfEmployer > 0 && (
              <div className="col-span-2 mt-3 bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
                <p className="font-medium text-slate-600 mb-1">Employer Contributions (CTC add-on)</p>
                <div className="flex justify-between"><span>PF Employer (12%)</span><span>{formatCurrency(row.pfEmployer)}</span></div>
                {row.esiEmployer > 0 && <div className="flex justify-between"><span>ESI Employer (3.25%)</span><span>{formatCurrency(row.esiEmployer)}</span></div>}
                <div className="flex justify-between font-medium mt-1"><span>Total CTC</span><span>{formatCurrency(row.gross + row.pfEmployer + row.esiEmployer)}</span></div>
              </div>
            )}
          </div>

          <button
            onClick={() => { window.print() }}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Print / Download
          </button>
        </div>
      </div>
    )
  }

  // ─── Slide-in form ─────────────────────────────────────────────────────────

  const FieldError = ({ field }: { field: string }) =>
    formErrors[field] ? <p className="text-xs text-red-500 mt-1">{formErrors[field]}</p> : null

  const inputCls = (field: string) =>
    `w-full border rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors[field] ? 'border-red-400' : 'border-slate-200'}`

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Payroll</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedMonth}
            onChange={e => { setSelectedMonth(Number(e.target.value)); setPayrollRun(false) }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={e => { setSelectedYear(Number(e.target.value)); setPayrollRun(false) }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleRunPayroll}
            disabled={runningPayroll || employees.filter(e => e.isActive).length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {runningPayroll ? 'Processing…' : '▶ Run Payroll'}
          </button>
          <button
            onClick={openAddForm}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Employee
          </button>
        </div>
      </div>

      {/* Summary cards — shown after payroll run */}
      {payrollRun && payslipRows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Gross', value: totals.gross, color: 'text-slate-800' },
            { label: 'Total PF', value: totals.pf, color: 'text-orange-600' },
            { label: 'Total TDS', value: totals.tds, color: 'text-purple-600' },
            { label: 'Total Net Pay', value: totals.net, color: 'text-green-700' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">{c.label}</p>
              <p className={`text-lg font-bold ${c.color}`}>{formatCurrency(c.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Employee / payslip table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Employee</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Designation</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Basic</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">HRA</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Gross</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">PF</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">ESI</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">TDS</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Net Pay</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                    No employees yet. Click &quot;+ Add Employee&quot; to get started.
                  </td>
                </tr>
              ) : payrollRun ? (
                // show payslip rows after run
                payslipRows.map(row => (
                  <tr
                    key={row.employee.id}
                    className="hover:bg-blue-50 cursor-pointer"
                    onClick={() => setSelectedPayslip(row)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{row.employee.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.employee.designation}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.basic)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.hra)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(row.gross)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(row.pfEmployee)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(row.esiEmployee)}</td>
                    <td className="px-4 py-3 text-right text-purple-600">{formatCurrency(row.tds)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(row.netPay)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Processed</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-blue-500 text-xs hover:underline">View Payslip</span>
                    </td>
                  </tr>
                ))
              ) : (
                // show employee list before payroll run
                employees.map(emp => {
                  const preview = calcPayslip(emp, selectedMonth, selectedYear)
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{emp.name}</td>
                      <td className="px-4 py-3 text-slate-600">{emp.designation}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(emp.basicSalary)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(preview.hra)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(preview.gross)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{emp.pfApplicable ? formatCurrency(preview.pfEmployee) : '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{emp.esiApplicable ? formatCurrency(preview.esiEmployee) : '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{emp.tdsSection !== 'None' ? formatCurrency(preview.tds) : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatCurrency(preview.netPay)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(emp.id)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${emp.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditForm(emp)} className="text-blue-500 text-xs hover:underline">Edit</button>
                          <button onClick={() => handleDelete(emp.id)} className="text-red-400 text-xs hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payrollRun && (
        <p className="text-xs text-slate-400 text-center mb-4">
          Click any row to view detailed payslip. Journal entries have been created for {MONTHS[selectedMonth]} {selectedYear}.
        </p>
      )}

      {/* ── Slide-in Add/Edit form ── */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={closeForm}>
          <div
            className="bg-white w-full max-w-lg h-full shadow-2xl overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{editId ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Personal */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Personal Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <input className={inputCls('name')} value={form.name} onChange={e => handleFormChange('name', e.target.value)} placeholder="e.g. Ravi Kumar" />
                    <FieldError field="name" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Designation *</label>
                      <input className={inputCls('designation')} value={form.designation} onChange={e => handleFormChange('designation', e.target.value)} placeholder="e.g. Engineer" />
                      <FieldError field="designation" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
                      <input className={inputCls('department')} value={form.department} onChange={e => handleFormChange('department', e.target.value)} placeholder="e.g. Operations" />
                      <FieldError field="department" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Joining Date *</label>
                    <input type="date" className={inputCls('joiningDate')} value={form.joiningDate} onChange={e => handleFormChange('joiningDate', e.target.value)} />
                    <FieldError field="joiningDate" />
                  </div>
                </div>
              </section>

              {/* Salary */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Salary Structure</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Basic Salary (₹/month) *</label>
                    <input
                      type="number" min="0"
                      className={inputCls('basicSalary')}
                      value={form.basicSalary || ''}
                      onChange={e => handleFormChange('basicSalary', parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 25000"
                    />
                    <FieldError field="basicSalary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">HRA % of Basic</label>
                      <input
                        type="number" min="0" max="100"
                        className={inputCls('hraPercent')}
                        value={form.hraPercent}
                        onChange={e => handleFormChange('hraPercent', parseFloat(e.target.value) || 0)}
                      />
                      <FieldError field="hraPercent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Other Allowances (₹)</label>
                      <input
                        type="number" min="0"
                        className={inputCls('otherAllowances')}
                        value={form.otherAllowances || ''}
                        onChange={e => handleFormChange('otherAllowances', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Live preview */}
                  {form.basicSalary > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                      <p className="font-semibold text-blue-800 mb-1">Salary Preview</p>
                      <div className="flex justify-between"><span>Basic</span><span>{formatCurrency(form.basicSalary)}</span></div>
                      <div className="flex justify-between"><span>HRA ({form.hraPercent}%)</span><span>{formatCurrency((form.hraPercent / 100) * form.basicSalary)}</span></div>
                      <div className="flex justify-between"><span>Other Allowances</span><span>{formatCurrency(form.otherAllowances)}</span></div>
                      <div className="flex justify-between font-semibold border-t border-blue-200 pt-1"><span>Gross</span><span>{formatCurrency(form.basicSalary + (form.hraPercent / 100) * form.basicSalary + form.otherAllowances)}</span></div>
                    </div>
                  )}
                </div>
              </section>

              {/* Statutory */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Statutory Deductions</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.pfApplicable}
                      onChange={e => handleFormChange('pfApplicable', e.target.checked)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-slate-700">
                      PF Applicable <span className="text-slate-400">(12% employee + 12% employer of Basic)</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.esiApplicable}
                      onChange={e => handleFormChange('esiApplicable', e.target.checked)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm text-slate-700">
                      ESI Applicable <span className="text-slate-400">(0.75% employee + 3.25% employer; only if gross ≤ ₹21,000)</span>
                    </span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">TDS Section</label>
                    <select
                      className={inputCls('tdsSection')}
                      value={form.tdsSection}
                      onChange={e => handleFormChange('tdsSection', e.target.value)}
                    >
                      {TDS_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  {form.tdsSection !== 'None' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">TDS Rate (%)</label>
                      <input
                        type="number" min="0" max="30"
                        className={inputCls('tdsRate')}
                        value={form.tdsRate}
                        onChange={e => handleFormChange('tdsRate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Bank */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Bank Details (for NEFT)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                    <input className={inputCls('bankAccount')} value={form.bankAccount} onChange={e => handleFormChange('bankAccount', e.target.value)} placeholder="e.g. 1234567890" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                      <input className={inputCls('bankName')} value={form.bankName} onChange={e => handleFormChange('bankName', e.target.value)} placeholder="e.g. SBI" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                      <input className={inputCls('ifsc')} value={form.ifsc} onChange={e => handleFormChange('ifsc', e.target.value.toUpperCase())} placeholder="e.g. SBIN0001234" />
                      <FieldError field="ifsc" />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex gap-3">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {editId ? 'Save Changes' : 'Add Employee'}
              </button>
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payslip modal */}
      {selectedPayslip && <PayslipModal row={selectedPayslip} />}
    </div>
  )
}
