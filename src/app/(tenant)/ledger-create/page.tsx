'use client'

import { useEffect, useState } from 'react'

// Tally-compatible groups (mirrors Tally Prime Chart of Accounts)
const TALLY_GROUPS = [
  // Liabilities
  { group: 'Capital Account',           type: 'equity',   sub_type: 'capital',                scheduleIII: 'Share Capital / Owners Funds',    isParty: false },
  { group: 'Reserves & Surplus',        type: 'equity',   sub_type: 'reserves',               scheduleIII: 'Reserves and Surplus',            isParty: false },
  { group: 'Secured Loans',             type: 'liability', sub_type: 'long_term_loan',         scheduleIII: 'Long-term Borrowings',            isParty: false },
  { group: 'Unsecured Loans',           type: 'liability', sub_type: 'long_term_loan',         scheduleIII: 'Long-term Borrowings',            isParty: false },
  { group: 'Bank OD Accounts',          type: 'liability', sub_type: 'short_term_borrowing',   scheduleIII: 'Short-term Borrowings',           isParty: false },
  { group: 'Current Liabilities',       type: 'liability', sub_type: 'other_current_liability', scheduleIII: 'Other Current Liabilities',      isParty: false },
  { group: 'Duties & Taxes',            type: 'liability', sub_type: 'other_current_liability', scheduleIII: 'Duties & Taxes',                 isParty: false },
  { group: 'Provisions',                type: 'liability', sub_type: 'st_provision',            scheduleIII: 'Short-term Provisions',          isParty: false },
  { group: 'Sundry Creditors',          type: 'liability', sub_type: 'trade_payable',           scheduleIII: 'Trade Payables',                 isParty: true  },
  // Assets
  { group: 'Fixed Assets',              type: 'asset',    sub_type: 'fixed_asset',             scheduleIII: 'Tangible Assets',                isParty: false },
  { group: 'Investments',               type: 'asset',    sub_type: 'investment_lt',           scheduleIII: 'Non-Current Investments',        isParty: false },
  { group: 'Sundry Debtors',            type: 'asset',    sub_type: 'trade_receivable',        scheduleIII: 'Trade Receivables',              isParty: true  },
  { group: 'Bank Accounts',             type: 'asset',    sub_type: 'bank',                    scheduleIII: 'Cash and Cash Equivalents',      isParty: false },
  { group: 'Cash-in-Hand',              type: 'asset',    sub_type: 'cash',                    scheduleIII: 'Cash and Cash Equivalents',      isParty: false },
  { group: 'Deposits (Asset)',          type: 'asset',    sub_type: 'loans_advances_lt',       scheduleIII: 'Long-term Loans and Advances',   isParty: false },
  { group: 'Loans & Advances (Asset)',  type: 'asset',    sub_type: 'loans_advances_st',       scheduleIII: 'Short-term Loans and Advances',  isParty: false },
  { group: 'Stock-in-Hand',             type: 'asset',    sub_type: 'inventory',               scheduleIII: 'Inventories',                    isParty: false },
  // Income
  { group: 'Sales Accounts',            type: 'income',   sub_type: 'sales',                   scheduleIII: '',                               isParty: false },
  { group: 'Direct Income',             type: 'income',   sub_type: 'direct_income',           scheduleIII: '',                               isParty: false },
  { group: 'Indirect Income',           type: 'income',   sub_type: 'other_income',            scheduleIII: '',                               isParty: false },
  // Expenses
  { group: 'Purchase Accounts',         type: 'expense',  sub_type: 'purchases',               scheduleIII: '',                               isParty: false },
  { group: 'Direct Expenses',           type: 'expense',  sub_type: 'direct_expense',          scheduleIII: '',                               isParty: false },
  { group: 'Indirect Expenses',         type: 'expense',  sub_type: 'indirect_expense',        scheduleIII: '',                               isParty: false },
]

const GST_REG_TYPES = ['Regular', 'Composition', 'Unregistered', 'Consumer', 'SEZ', 'Overseas']

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra & Nagar Haveli and Daman & Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
]

const DEFAULT_GROUP = TALLY_GROUPS[11] // Sundry Debtors

interface Account { id: string; name: string; code: string; type: string; sub_type?: string }

function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div className={half ? '' : 'sm:col-span-2'}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  )
}

const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const sel = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

export default function LedgerCreatePage() {
  const [accounts, setAccounts]   = useState<Account[]>([])
  const [saved, setSaved]         = useState<string | null>(null)
  const [error, setError]         = useState('')
  const [busy, setBusy]           = useState(false)
  const [activeTab, setActiveTab] = useState<'create'|'list'>('create')

  // Form state
  const [groupName,    setGroupName]    = useState(DEFAULT_GROUP.group)
  const [name,         setName]         = useState('')
  const [alias,        setAlias]        = useState('')
  const [code,         setCode]         = useState('')
  const [openingBal,   setOpeningBal]   = useState('')
  const [openingType,  setOpeningType]  = useState<'dr'|'cr'>('dr')
  const [parentId,     setParentId]     = useState('')
  // Party fields
  const [mailingName,  setMailingName]  = useState('')
  const [address,      setAddress]      = useState('')
  const [state,        setState]        = useState('')
  const [pincode,      setPincode]      = useState('')
  const [country,      setCountry]      = useState('India')
  const [pan,          setPan]          = useState('')
  const [regType,      setRegType]      = useState('Regular')
  const [gstin,        setGstin]        = useState('')
  const [billByBill,   setBillByBill]   = useState(true)
  const [creditPeriod, setCreditPeriod] = useState('30')
  const [checkCredit,  setCheckCredit]  = useState(false)
  const [bankAccNo,    setBankAccNo]    = useState('')
  const [bankIfsc,     setBankIfsc]     = useState('')
  const [bankName,     setBankName]     = useState('')
  const [provideBank,  setProvideBank]  = useState(false)

  const group = TALLY_GROUPS.find(g => g.group === groupName) ?? DEFAULT_GROUP
  const isParty = group.isParty

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(d => setAccounts(d.accounts || []))
  }, [])

  // Auto-set mailing name when ledger name changes
  useEffect(() => {
    if (!mailingName || mailingName === name) setMailingName(name)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSaved(null); setBusy(true)
    try {
      let res: Response

      if (isParty) {
        // Party ledger → POST /api/parties (creates account + party linked)
        res = await fetch('/api/parties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, alias, type: group.group === 'Sundry Creditors' ? 'vendor' : 'customer',
            gstin, pan, state, address, pincode, country,
            registrationType: regType,
            mailingName,
            maintainBillByBill: billByBill,
            defaultCreditPeriod: parseInt(creditPeriod) || 30,
            checkCreditDays: checkCredit,
            bankAccountNo: provideBank ? bankAccNo : undefined,
            bankIfsc: provideBank ? bankIfsc : undefined,
            bankName: provideBank ? bankName : undefined,
          }),
        })
      } else {
        // Regular ledger → POST /api/accounts/create
        res = await fetch('/api/accounts/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code, name, alias,
            type: group.type,
            sub_type: group.sub_type,
            parent_id: parentId || null,
            opening_balance: parseFloat(openingBal) || 0,
            opening_balance_type: openingType,
          }),
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create ledger')
      setSaved(`Ledger "${name}" created successfully.`)
      // Reset form
      setName(''); setAlias(''); setCode(''); setOpeningBal(''); setParentId('')
      setMailingName(''); setAddress(''); setState(''); setPincode(''); setPan('')
      setGstin(''); setBankAccNo(''); setBankIfsc(''); setBankName('')
      setRegType('Regular'); setBillByBill(true); setCreditPeriod('30')
      setCheckCredit(false); setProvideBank(false)
      fetch('/api/accounts').then(r => r.json()).then(d => setAccounts(d.accounts || []))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create ledger')
    } finally {
      setBusy(false)
    }
  }

  const typeLabel: Record<string, string> = {
    asset: 'Current Asset', liability: 'Current Liability',
    equity: 'Capital / Equity', income: 'Income', expense: 'Expense',
  }
  const grouped = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    (acc[a.type] ||= []).push(a); return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ledger Creation</h1>
          <p className="text-xs text-slate-500 mt-0.5">Tally-compatible chart of accounts</p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(['create','list'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t === 'create' ? '+ New Ledger' : `Chart of Accounts (${accounts.length})`}
            </button>
          ))}
        </div>
      </div>

      {saved && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2.5 text-sm">{saved}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{error}</div>}

      {activeTab === 'create' && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">

          {/* ── Section: Basic ── */}
          <div className="px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Ledger Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name *" half>
                <input required value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="e.g. Asian Paints Ltd." />
              </Field>
              <Field label="Alias (optional)" half>
                <input value={alias} onChange={e => setAlias(e.target.value)} className={inp} placeholder="Short name / nick" />
              </Field>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Under (Group) *</label>
                <select required value={groupName} onChange={e => setGroupName(e.target.value)} className={sel}>
                  {['Liabilities', 'Assets', 'Income', 'Expenses'].map(section => {
                    const items = TALLY_GROUPS.filter(g =>
                      section === 'Liabilities' ? ['equity','liability'].includes(g.type) :
                      section === 'Assets'      ? g.type === 'asset'   :
                      section === 'Income'      ? g.type === 'income'  : g.type === 'expense'
                    )
                    return (
                      <optgroup key={section} label={section}>
                        {items.map(g => (
                          <option key={g.group} value={g.group}>{g.group}</option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  {typeLabel[group.type] ?? group.type}
                  {group.scheduleIII ? <> &nbsp;·&nbsp; Schedule III: <span className="font-medium text-slate-600">{group.scheduleIII}</span></> : null}
                </p>
              </div>

              {!isParty && (
                <>
                  <Field label="Account Code *" half>
                    <input required value={code} onChange={e => setCode(e.target.value)} className={inp} placeholder="e.g. 1001" />
                  </Field>
                  <Field label="Opening Balance" half>
                    <div className="flex gap-2">
                      <input type="number" min="0" step="0.01" value={openingBal} onChange={e => setOpeningBal(e.target.value)} className={`${inp} flex-1`} placeholder="0.00" />
                      <select value={openingType} onChange={e => setOpeningType(e.target.value as 'dr'|'cr')} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                        <option value="dr">Dr</option>
                        <option value="cr">Cr</option>
                      </select>
                    </div>
                  </Field>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Parent Account</label>
                    <select value={parentId} onChange={e => setParentId(e.target.value)} className={sel}>
                      <option value="">None (top-level)</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Party-only sections ── */}
          {isParty && (
            <>
              {/* Bill-by-bill */}
              <div className="px-6 py-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Outstanding Management</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Maintain balances bill-by-bill?" half>
                    <select value={billByBill ? 'yes' : 'no'} onChange={e => setBillByBill(e.target.value === 'yes')} className={sel}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </Field>
                  <Field label="Default credit period (days)" half>
                    <input type="number" min="0" value={creditPeriod} onChange={e => setCreditPeriod(e.target.value)} className={inp} />
                  </Field>
                  <Field label="Check for credit days during voucher entry?" half>
                    <select value={checkCredit ? 'yes' : 'no'} onChange={e => setCheckCredit(e.target.value === 'yes')} className={sel}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </Field>
                </div>
              </div>

              {/* Mailing Details */}
              <div className="px-6 py-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Mailing Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Mailing Name</label>
                    <input value={mailingName} onChange={e => setMailingName(e.target.value)} className={inp} placeholder="Name for correspondence (defaults to ledger name)" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Address</label>
                    <input value={address} onChange={e => setAddress(e.target.value)} className={inp} placeholder="Street / Locality" />
                  </div>
                  <Field label="State" half>
                    <select value={state} onChange={e => setState(e.target.value)} className={sel}>
                      <option value="">Select state</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Country" half>
                    <input value={country} onChange={e => setCountry(e.target.value)} className={inp} />
                  </Field>
                  <Field label="Pincode" half>
                    <input value={pincode} onChange={e => setPincode(e.target.value)} maxLength={6} className={inp} placeholder="110001" />
                  </Field>
                </div>
              </div>

              {/* Banking Details */}
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 mb-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Banking Details</p>
                  <select value={provideBank ? 'yes' : 'no'} onChange={e => setProvideBank(e.target.value === 'yes')} className="border border-slate-200 rounded px-2 py-1 text-xs bg-white">
                    <option value="no">Provide bank details: No</option>
                    <option value="yes">Provide bank details: Yes</option>
                  </select>
                </div>
                {provideBank && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Account Number" half>
                      <input value={bankAccNo} onChange={e => setBankAccNo(e.target.value)} className={inp} />
                    </Field>
                    <Field label="IFSC Code" half>
                      <input value={bankIfsc} onChange={e => setBankIfsc(e.target.value.toUpperCase())} className={inp} placeholder="HDFC0001234" />
                    </Field>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Bank Name</label>
                      <input value={bankName} onChange={e => setBankName(e.target.value)} className={inp} placeholder="HDFC Bank" />
                    </div>
                  </div>
                )}
              </div>

              {/* Tax Registration */}
              <div className="px-6 py-5">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Tax Registration Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="PAN / IT No." half>
                    <input value={pan} onChange={e => setPan(e.target.value.toUpperCase())} maxLength={10} className={inp} placeholder="AAAAA0000A" />
                  </Field>
                  <Field label="Registration Type" half>
                    <select value={regType} onChange={e => setRegType(e.target.value)} className={sel}>
                      {GST_REG_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </Field>
                  {['Regular','Composition','SEZ'].includes(regType) && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">GSTIN / UIN</label>
                      <input value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} maxLength={15} className={inp} placeholder="22AAAAA0000A1Z5" />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="px-6 py-4 flex justify-end">
            <button type="submit" disabled={busy}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-8 py-2.5 rounded-lg">
              {busy ? 'Creating…' : 'Accept'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {accounts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">No accounts yet. Create a company first to see the seeded chart of accounts.</div>
          ) : (
            Object.entries(grouped).map(([type, list]) => (
              <div key={type}>
                <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{typeLabel[type] ?? type}</span>
                  <span className="text-xs text-slate-400">({list.length})</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium">
                      <th className="px-5 py-2 text-left w-24">Code</th>
                      <th className="px-5 py-2 text-left">Name</th>
                      <th className="px-5 py-2 text-left hidden md:table-cell">Group</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {list.map(a => {
                      const g = TALLY_GROUPS.find(tg => tg.sub_type === a.sub_type)
                      return (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{a.code}</td>
                          <td className="px-5 py-2.5 text-slate-800">{a.name}</td>
                          <td className="px-5 py-2.5 text-xs text-slate-400 hidden md:table-cell">{g?.group || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
