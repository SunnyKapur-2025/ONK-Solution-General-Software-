'use client'

/**
 * Power Mode — Tally-style keyboard-first voucher entry.
 * F4=Contra F5=Payment F6=Receipt F7=Journal F8=Sales F9=Purchase
 * Tab/Enter to advance fields. No mouse needed end-to-end.
 * Ctrl+A to accept/save. Escape to cancel.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'

export type VoucherType = 'payment' | 'receipt' | 'contra' | 'sales' | 'purchase' | 'journal'

const VOUCHER_LABELS: Record<VoucherType, string> = {
  payment:  'Payment',
  receipt:  'Receipt',
  contra:   'Contra',
  sales:    'Sales',
  purchase: 'Purchase',
  journal:  'Journal',
}

const VOUCHER_COLORS: Record<VoucherType, string> = {
  payment:  'bg-red-600',
  receipt:  'bg-green-600',
  contra:   'bg-purple-600',
  sales:    'bg-blue-600',
  purchase: 'bg-orange-600',
  journal:  'bg-slate-600',
}

interface Party { id: string; name: string }
interface Account { id: string; name: string; code: string; type: string }

interface VoucherLine {
  accountId: string
  accountName: string
  debit: number
  credit: number
  narration: string
}

interface Props {
  parties: Party[]
  accounts: Account[]
  onSave: (voucher: {
    type: VoucherType
    date: string
    partyId: string
    narration: string
    reference: string
    lines: VoucherLine[]
  }) => Promise<void>
}

export default function PowerModeEntry({ parties, accounts, onSave }: Props) {
  const [voucherType, setVoucherType] = useState<VoucherType>('sales')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [partySearch, setPartySearch] = useState('')
  const [partyId, setPartyId] = useState('')
  const [narration, setNarration] = useState('')
  const [reference, setReference] = useState('')
  const [lines, setLines] = useState<VoucherLine[]>([
    { accountId: '', accountName: '', debit: 0, credit: 0, narration: '' },
  ])
  const [activeLineIdx, setActiveLineIdx] = useState(0)
  const [acSearch, setAcSearch] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const partyRef = useRef<HTMLInputElement>(null)
  const narrationRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setPartySearch(''); setPartyId(''); setNarration(''); setReference('')
    setLines([{ accountId: '', accountName: '', debit: 0, credit: 0, narration: '' }])
    setAcSearch(['']); setActiveLineIdx(0); setError('')
    partyRef.current?.focus()
  }

  // Party autocomplete
  const partyMatches = partySearch.length > 0
    ? parties.filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase())).slice(0, 6)
    : []

  // Account autocomplete for a line
  function accountMatches(search: string) {
    if (!search || search.length < 1) return []
    return accounts.filter(a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.includes(search)
    ).slice(0, 8)
  }

  function setLine(idx: number, field: keyof VoucherLine, value: string | number) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  function setAcSearchAt(idx: number, val: string) {
    setAcSearch(prev => { const n = [...prev]; n[idx] = val; return n })
  }

  function selectAccount(idx: number, account: Account) {
    setLine(idx, 'accountId', account.id)
    setLine(idx, 'accountName', account.name)
    setAcSearchAt(idx, account.name)
  }

  function addLine() {
    setLines(prev => [...prev, { accountId: '', accountName: '', debit: 0, credit: 0, narration: '' }])
    setAcSearch(prev => [...prev, ''])
  }

  function removeLine(idx: number) {
    if (lines.length === 1) return
    setLines(prev => prev.filter((_, i) => i !== idx))
    setAcSearch(prev => prev.filter((_, i) => i !== idx))
  }

  const totalDebit  = lines.reduce((s, l) => s + (l.debit  || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0)
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01

  // Declare handleSave BEFORE useEffect so it can be referenced in deps
  const handleSave = useCallback(async () => {
    if (!isBalanced) { setError('Entry not balanced. Debit must equal Credit.'); return }
    if (lines.some(l => !l.accountId)) { setError('All lines must have an account selected.'); return }
    setError(''); setSaving(true)
    try {
      await onSave({ type: voucherType, date, partyId, narration, reference, lines })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      resetForm()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [isBalanced, lines, onSave, voucherType, date, partyId, narration, reference])

  // Global keyboard shortcuts — F4-F9 for voucher type, Ctrl+A to save, Esc to reset
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 'a') { e.preventDefault(); handleSave() }
      if (e.key === 'F4') { e.preventDefault(); setVoucherType('contra') }
      if (e.key === 'F5') { e.preventDefault(); setVoucherType('payment') }
      if (e.key === 'F6') { e.preventDefault(); setVoucherType('receipt') }
      if (e.key === 'F7') { e.preventDefault(); setVoucherType('journal') }
      if (e.key === 'F8') { e.preventDefault(); setVoucherType('sales') }
      if (e.key === 'F9') { e.preventDefault(); setVoucherType('purchase') }
      if (e.key === 'Escape') { resetForm() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSave])

  return (
    <div className="bg-slate-900 text-green-400 font-mono text-sm rounded-xl overflow-hidden border border-slate-700">

      {/* Function key bar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-slate-800 border-b border-slate-700 overflow-x-auto">
        {(['contra','payment','receipt','journal','sales','purchase'] as VoucherType[]).map((t, i) => (
          <button key={t} onClick={() => setVoucherType(t)}
            className={`px-3 py-1 rounded text-xs font-bold transition-all whitespace-nowrap ${
              voucherType === t
                ? `${VOUCHER_COLORS[t]} text-white`
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}>
            F{i + 4} {VOUCHER_LABELS[t]}
          </button>
        ))}
        <div className="ml-auto flex gap-2 text-xs text-slate-500 whitespace-nowrap">
          <span>Ctrl+A Save</span>
          <span>Esc Cancel</span>
        </div>
      </div>

      {/* Voucher header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className={`inline-block px-3 py-0.5 rounded text-white text-xs font-bold mb-3 ${VOUCHER_COLORS[voucherType]}`}>
          {VOUCHER_LABELS[voucherType]} Voucher
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-slate-500 text-xs">Date</span>
            <input ref={dateRef} type="date" value={date}
              onChange={e => setDate(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && partyRef.current?.focus()}
              className="block w-full bg-transparent text-green-300 border-b border-slate-600 focus:border-green-400 outline-none py-0.5 mt-0.5" />
          </div>
          <div className="relative">
            <span className="text-slate-500 text-xs">Party</span>
            <input ref={partyRef} type="text" value={partySearch}
              onChange={e => { setPartySearch(e.target.value); setPartyId('') }}
              onKeyDown={e => e.key === 'Enter' && narrationRef.current?.focus()}
              placeholder="Type party name…"
              className="block w-full bg-transparent text-green-300 border-b border-slate-600 focus:border-green-400 outline-none py-0.5 mt-0.5 placeholder-slate-600" />
            {partyMatches.length > 0 && (
              <div className="absolute top-full left-0 z-10 bg-slate-800 border border-slate-600 rounded-lg w-64 mt-1 shadow-xl">
                {partyMatches.map(p => (
                  <button key={p.id} onClick={() => { setPartyId(p.id); setPartySearch(p.name) }}
                    className="block w-full text-left px-3 py-1.5 text-green-300 hover:bg-slate-700 text-xs">
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <span className="text-slate-500 text-xs">Narration</span>
            <input ref={narrationRef} type="text" value={narration}
              onChange={e => setNarration(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { document.getElementById(`ac-line-0`)?.focus() }}}
              placeholder="Description…"
              className="block w-full bg-transparent text-green-300 border-b border-slate-600 focus:border-green-400 outline-none py-0.5 mt-0.5 placeholder-slate-600" />
          </div>
        </div>
      </div>

      {/* Entry lines */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-12 gap-2 text-xs text-slate-500 mb-1 px-1">
          <div className="col-span-5">Account / Ledger</div>
          <div className="col-span-2 text-right">Debit (Dr)</div>
          <div className="col-span-2 text-right">Credit (Cr)</div>
          <div className="col-span-2">Narration</div>
          <div className="col-span-1" />
        </div>

        {lines.map((line, idx) => (
          <div key={idx} className={`grid grid-cols-12 gap-2 py-1 px-1 rounded ${activeLineIdx === idx ? 'bg-slate-800' : ''}`}
            onClick={() => setActiveLineIdx(idx)}>

            {/* Account */}
            <div className="col-span-5 relative">
              <input id={`ac-line-${idx}`} type="text"
                value={acSearch[idx] || ''}
                onChange={e => { setAcSearchAt(idx, e.target.value); setLine(idx, 'accountId', '') }}
                onFocus={() => setActiveLineIdx(idx)}
                onKeyDown={e => {
                  if (e.key === 'Enter') document.getElementById(`dr-line-${idx}`)?.focus()
                  if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); document.getElementById(`ac-line-${idx - 1}`)?.focus() }
                }}
                placeholder="Account name or code…"
                className="w-full bg-transparent text-green-300 border-b border-slate-700 focus:border-green-400 outline-none py-0.5 placeholder-slate-600" />
              {activeLineIdx === idx && accountMatches(acSearch[idx] || '').length > 0 && (
                <div className="absolute top-full left-0 z-10 bg-slate-800 border border-slate-600 rounded-lg w-72 mt-1 shadow-xl max-h-48 overflow-y-auto">
                  {accountMatches(acSearch[idx] || '').map(a => (
                    <button key={a.id} onClick={() => selectAccount(idx, a)}
                      className="block w-full text-left px-3 py-1.5 text-green-300 hover:bg-slate-700 text-xs">
                      <span className="text-slate-500 mr-2">{a.code}</span>{a.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Debit */}
            <div className="col-span-2">
              <input id={`dr-line-${idx}`} type="number" min="0" step="0.01"
                value={line.debit || ''}
                onChange={e => setLine(idx, 'debit', parseFloat(e.target.value) || 0)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); document.getElementById(`cr-line-${idx}`)?.focus() }}}
                placeholder="0.00"
                className="w-full bg-transparent text-green-300 border-b border-slate-700 focus:border-green-400 outline-none py-0.5 text-right placeholder-slate-600" />
            </div>

            {/* Credit */}
            <div className="col-span-2">
              <input id={`cr-line-${idx}`} type="number" min="0" step="0.01"
                value={line.credit || ''}
                onChange={e => setLine(idx, 'credit', parseFloat(e.target.value) || 0)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault()
                    if (idx === lines.length - 1) addLine()
                    setTimeout(() => document.getElementById(`ac-line-${idx + 1}`)?.focus(), 50)
                  }
                }}
                placeholder="0.00"
                className="w-full bg-transparent text-green-300 border-b border-slate-700 focus:border-green-400 outline-none py-0.5 text-right placeholder-slate-600" />
            </div>

            {/* Line narration */}
            <div className="col-span-2">
              <input type="text" value={line.narration}
                onChange={e => setLine(idx, 'narration', e.target.value)}
                placeholder="Note…"
                className="w-full bg-transparent text-slate-400 border-b border-slate-700 focus:border-green-400 outline-none py-0.5 placeholder-slate-700 text-xs" />
            </div>

            {/* Remove */}
            <div className="col-span-1 text-right">
              {lines.length > 1 && (
                <button onClick={() => removeLine(idx)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
              )}
            </div>
          </div>
        ))}

        <button onClick={addLine}
          className="mt-2 text-xs text-slate-600 hover:text-green-400 px-1">
          + Add line (Alt+I)
        </button>
      </div>

      {/* Totals + status */}
      <div className="px-4 py-3 bg-slate-800 border-t border-slate-700 flex items-center justify-between">
        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-xs text-slate-500">Total Debit</p>
            <p className="text-green-300 font-bold font-mono">{formatCurrency(totalDebit)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Total Credit</p>
            <p className="text-green-300 font-bold font-mono">{formatCurrency(totalCredit)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Difference</p>
            <p className={`font-bold font-mono ${isBalanced ? 'text-green-400' : 'text-red-400'}`}>
              {isBalanced ? '✓ Balanced' : formatCurrency(Math.abs(totalDebit - totalCredit))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {error && <p className="text-red-400 text-xs max-w-xs">{error}</p>}
          {saved && <p className="text-green-400 text-xs">Saved ✓</p>}
          <button onClick={resetForm} className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5">
            Esc Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !isBalanced}
            className="bg-green-700 hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-1.5 rounded text-xs font-bold transition-colors">
            {saving ? 'Saving…' : 'Ctrl+A  Accept'}
          </button>
        </div>
      </div>
    </div>
  )
}
