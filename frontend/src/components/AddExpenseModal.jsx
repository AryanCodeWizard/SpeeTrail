import { useState, useEffect } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

// ─── Currency symbols ─────────────────────────────────────────────────────────
const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }

// ─── Split type options ───────────────────────────────────────────────────────
const SPLIT_TYPES = [
  { value: 'equal',      label: 'Equally',    icon: '⚖️', color: 'from-blue-500 to-cyan-500' },
  { value: 'unequal',    label: 'Exact',      icon: '🔢', color: 'from-purple-500 to-pink-500' },
  { value: 'percentage', label: 'Percent',    icon: '%',  color: 'from-orange-500 to-red-500' },
  { value: 'share',      label: 'Shares',     icon: '🍕', color: 'from-emerald-500 to-teal-500' }
]

export default function AddExpenseModal({ groupId, members, onClose, onAdded }) {
  const { user } = useAuth()

  // ── Core form state ──────────────────────────────────────────────────────────
  const [description, setDescription] = useState('')
  const [amount,      setAmount]      = useState('')
  const [currency,    setCurrency]    = useState('INR')
  const [paidBy,      setPaidBy]      = useState(user?.id || '')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [splitType,   setSplitType]   = useState('equal')
  const [loading,     setLoading]     = useState(false)
  const [step,        setStep]        = useState('main') // 'main' | 'split' | 'currency' | 'date'

  // ── Per-participant state ────────────────────────────────────────────────────
  const [participants, setParticipants] = useState(
    members.map(m => ({
      userId:   m.id,
      name:     m.name,
      included: true,
      value:    ''
    }))
  )

  // Reset participant values when split type changes
  useEffect(() => {
    setParticipants(members.map(m => ({
      userId:   m.id,
      name:     m.name,
      included: true,
      value:    ''
    })))
  }, [splitType])

  // ── Computed helpers ─────────────────────────────────────────────────────────
  const total       = parseFloat(amount) || 0
  const included    = participants.filter(p => p.included)
  const symbol      = CURRENCY_SYMBOLS[currency] || currency

  function getEqualShare() {
    if (!included.length || !total) return 0
    return (total / included.length).toFixed(2)
  }

  function getPercentSum() {
    return included.reduce((s, p) => s + (parseFloat(p.value) || 0), 0)
  }

  function getExactSum() {
    return included.reduce((s, p) => s + (parseFloat(p.value) || 0), 0)
  }

  function getShareTotal() {
    return included.reduce((s, p) => s + (parseFloat(p.value) || 1), 0)
  }

  function getShareAmount(p) {
    const units = parseFloat(p.value) || 1
    const total_units = getShareTotal()
    return total_units > 0 ? (total * units / total_units).toFixed(2) : '0.00'
  }

  // ── Validation ────────────────────────────────────────────────────────────────
  function validate() {
    if (!description.trim()) { toast.error('Add a description'); return false }
    if (!total || total <= 0) { toast.error('Enter a valid amount'); return false }
    if (!paidBy)              { toast.error('Select who paid'); return false }
    if (included.length === 0){ toast.error('Select at least one person'); return false }

    if (splitType === 'percentage') {
      const sum = getPercentSum()
      if (Math.abs(sum - 100) > 0.01) {
        toast.error(`Percentages sum to ${sum.toFixed(1)}%, need 100%`)
        return false
      }
    }

    if (splitType === 'unequal') {
      const sum = getExactSum()
      if (Math.abs(sum - total) > 0.02) {
        toast.error(`Amounts sum to ${symbol}${sum.toFixed(2)}, need ${symbol}${total.toFixed(2)}`)
        return false
      }
    }

    return true
  }

  // ── Build splits for API ──────────────────────────────────────────────────────
  function buildParticipantsPayload() {
    return included.map(p => ({
      userId:  p.userId,
      percent: splitType === 'percentage' ? parseFloat(p.value || 0) : undefined,
      share:   splitType === 'unequal'    ? parseFloat(p.value || 0) : undefined,
      units:   splitType === 'share'      ? parseFloat(p.value || 1) : undefined
    }))
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await api.post(`/expenses/${groupId}`, {
        description: description.trim(),
        amount,
        currency,
        splitType,
        expenseDate,
        paidBy,
        participants: buildParticipantsPayload()
      })
      onAdded(res.data.expense)
      toast.success('Expense added')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add expense')
    } finally {
      setLoading(false)
    }
  }

  // ── Split summary label ──────────────────────────────────────────────────────
  function splitSummaryLabel() {
    if (splitType === 'equal') {
      return `Split equally — ${symbol}${getEqualShare()} each`
    }
    if (splitType === 'percentage') {
      const sum = getPercentSum()
      return `By percentage — ${sum.toFixed(0)}% of 100%`
    }
    if (splitType === 'unequal') {
      const sum = getExactSum()
      return `Exact amounts — ${symbol}${sum.toFixed(2)} of ${symbol}${total.toFixed(2)}`
    }
    if (splitType === 'share') {
      return `By shares — ${included.length} people`
    }
    return ''
  }

  function toggle(userId) {
    setParticipants(prev =>
      prev.map(p => p.userId === userId ? { ...p, included: !p.included } : p)
    )
  }

  function setVal(userId, value) {
    setParticipants(prev =>
      prev.map(p => p.userId === userId ? { ...p, value } : p)
    )
  }

  const currentSplitType = SPLIT_TYPES.find(t => t.value === splitType)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal - premium dark glass */}
      <div className="relative glass-card w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-[0_40px_90px_rgba(15,23,42,0.3)] overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom sm:animate-in fade-in zoom-in-95 duration-200 border border-white/10 backdrop-blur-xl">

        {/* Gradient header decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500" />

        {/* ── MAIN STEP ──────────────────────────────────────────────────────── */}
        {step === 'main' && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/90">
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-100 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <h2 className="text-base font-bold text-white">Add expense</h2>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-sm font-semibold px-4 py-1.5 rounded-full shadow-sm transition-all disabled:opacity-40 active:scale-95"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Hero section with subtle pattern */}
              <div className="px-5 py-6 bg-slate-950/90 space-y-5">
                <input
                  autoFocus
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What was this expense for?"
                  className="w-full text-xl font-bold text-white placeholder-slate-500 border-none outline-none bg-transparent focus:ring-0"
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep('currency')}
                    className="flex items-center gap-1.5 bg-slate-900/80 border border-white/10 hover:border-cyan-400/40 hover:shadow-md px-3 py-2 rounded-2xl transition-all"
                  >
                    <span className="text-xl font-bold text-cyan-300">{symbol}</span>
                    <span className="text-xs text-slate-400">{currency}</span>
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 text-4xl font-bold text-white placeholder-slate-500 border-none outline-none bg-transparent focus:ring-0"
                  />
                </div>
              </div>

              {/* Paid by - colorful chips */}
              <div className="px-5 py-4 border-b border-white/10">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <span>💰</span> Paid by
                </p>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => {
                    const isSelected = paidBy === m.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => setPaidBy(m.id)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md scale-105'
                            : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {m.id === user?.id ? 'You' : m.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Split with */}
              <div className="px-5 py-4 border-b border-white/10">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <span>👥</span> Split with
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {participants.map(p => (
                    <button
                      key={p.userId}
                      onClick={() => toggle(p.userId)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        p.included
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm'
                          : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {p.userId === user?.id ? 'You' : p.name}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setStep('split')}
                  className="w-full flex items-center justify-between p-3 bg-slate-900/90 hover:bg-slate-800 rounded-2xl transition-all group shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{currentSplitType?.icon}</span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">
                        {currentSplitType?.label}
                      </p>
                      {total > 0 && included.length > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {splitSummaryLabel()}
                        </p>
                      )}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Date */}
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span>📅</span> Date
                </p>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </>
        )}

        {/* ── SPLIT TYPE STEP ───────────────────────────────────────────────── */}
        {step === 'split' && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/90">
              <button
                onClick={() => setStep('main')}
                className="text-slate-400 hover:text-slate-100 text-sm font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h2 className="text-base font-bold bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent">Split options</h2>
              <button
                onClick={() => setStep('main')}
                className="text-cyan-300 hover:text-cyan-100 text-sm font-semibold"
              >
                Done
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Split type tabs - colorful */}
              <div className="grid grid-cols-4 gap-2">
                {SPLIT_TYPES.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSplitType(opt.value)}
                    className={`py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      splitType === opt.value
                        ? `bg-gradient-to-r ${opt.color} text-white shadow-md scale-105`
                        : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-base mb-0.5">{opt.icon}</div>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* ── EQUAL split ────────────────────────────────────────────── */}
              {splitType === 'equal' && (
                <div className="space-y-2 pt-2">
                  {participants.map(p => (
                    <div
                      key={p.userId}
                      onClick={() => toggle(p.userId)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all ${
                        p.included
                          ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 shadow-sm'
                          : 'bg-slate-950/90 border border-white/10 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          p.included ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow' : 'bg-slate-900/80 text-slate-300'
                        }`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={`text-sm font-medium ${p.included ? 'text-slate-100' : 'text-slate-400'}`}>
                          {p.userId === user?.id ? 'You' : p.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {p.included && total > 0 && (
                          <span className="text-sm font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            {symbol}{getEqualShare()}
                          </span>
                        )}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          p.included
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-white/10'
                        }`}>
                          {p.included && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {total > 0 && included.length > 0 && (
                    <div className="text-center text-xs text-slate-400 bg-slate-950/80 p-2 rounded-2xl mt-2">
                      {symbol}{total.toFixed(2)} ÷ {included.length} = <span className="font-bold text-blue-600">{symbol}{getEqualShare()}</span> each
                    </div>
                  )}
                </div>
              )}

              {/* ── PERCENTAGE split ────────────────────────────────────────── */}
              {splitType === 'percentage' && (
                <div className="space-y-2 pt-2">
                  {participants.map(p => (
                    <div
                      key={p.userId}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
                        p.included ? 'border-orange-500/30 bg-slate-950/80' : 'border-white/10 bg-slate-950/80 opacity-80'
                      }`}
                    >
                      <button
                        onClick={() => toggle(p.userId)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                          p.included ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow' : 'bg-slate-900/80 text-slate-400'
                        }`}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </button>

                      <span className="flex-1 text-sm font-medium text-slate-100 truncate">
                        {p.userId === user?.id ? 'You' : p.name}
                      </span>

                      {p.included && (
                        <>
                          {total > 0 && (
                            <span className="text-xs text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded">
                              {symbol}{((total * parseFloat(p.value || 0)) / 100).toFixed(2)}
                            </span>
                          )}
                          <div className="flex items-center gap-1 bg-orange-500/10 rounded-lg px-2 py-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={p.value}
                              onChange={e => setVal(p.userId, e.target.value)}
                              placeholder="0"
                              className="w-12 bg-transparent text-sm font-bold text-white text-right outline-none"
                            />
                            <span className="text-sm text-orange-500">%</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  <div className={`flex justify-between px-4 py-2.5 rounded-xl text-sm font-bold ${
                    Math.abs(getPercentSum() - 100) < 0.01
                      ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-200 border border-amber-500/20'
                  }`}>
                    <span>Total</span>
                    <span>{getPercentSum().toFixed(1)}% of 100%</span>
                  </div>
                </div>
              )}

              {/* ── EXACT AMOUNTS split ─────────────────────────────────────── */}
              {splitType === 'unequal' && (
                <div className="space-y-2 pt-2">
                  {participants.map(p => (
                    <div
                      key={p.userId}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
                        p.included ? 'border-purple-500/30 bg-slate-950/80' : 'border-white/10 bg-slate-950/80 opacity-80'
                      }`}
                    >
                      <button
                        onClick={() => toggle(p.userId)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                          p.included ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow' : 'bg-slate-900/80 text-slate-400'
                        }`}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </button>

                      <span className="flex-1 text-sm font-medium text-slate-100 truncate">
                        {p.userId === user?.id ? 'You' : p.name}
                      </span>

                      {p.included && (
                        <div className="flex items-center gap-1 bg-purple-500/10 rounded-lg px-2 py-1">
                          <span className="text-sm text-purple-500">{symbol}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={p.value}
                            onChange={e => setVal(p.userId, e.target.value)}
                            placeholder="0.00"
                            className="w-20 bg-transparent text-sm font-bold text-white text-right outline-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {total > 0 && (
                    <div className={`flex justify-between px-4 py-2.5 rounded-xl text-sm font-bold ${
                      Math.abs(getExactSum() - total) < 0.02
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      <span>
                        {Math.abs(getExactSum() - total) < 0.02
                          ? '✓ All accounted for'
                          : getExactSum() < total
                            ? `${symbol}${(total - getExactSum()).toFixed(2)} left`
                            : `${symbol}${(getExactSum() - total).toFixed(2)} over`}
                      </span>
                      <span>{symbol}{getExactSum().toFixed(2)} of {symbol}{total.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── SHARES split ────────────────────────────────────────────── */}
              {splitType === 'share' && (
                <div className="space-y-2 pt-2">
                  {participants.map(p => (
                    <div
                      key={p.userId}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
                        p.included ? 'border-emerald-500/30 bg-slate-950/80' : 'border-white/10 bg-slate-950/80 opacity-80'
                      }`}
                    >
                      <button
                        onClick={() => toggle(p.userId)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                          p.included ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow' : 'bg-slate-900/80 text-slate-400'
                        }`}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </button>

                      <span className="flex-1 text-sm font-medium text-slate-100 truncate">
                        {p.userId === user?.id ? 'You' : p.name}
                      </span>

                      {p.included && (
                        <>
                          {total > 0 && (
                            <span className="text-xs text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded">
                              {symbol}{getShareAmount(p)}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setVal(p.userId, Math.max(1, (parseFloat(p.value) || 1) - 1).toString())}
                              className="w-7 h-7 rounded-full bg-slate-900/80 text-slate-300 flex items-center justify-center text-lg font-bold hover:bg-slate-800 transition-all active:scale-95"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-slate-100">
                              {p.value || '1'}
                            </span>
                            <button
                              onClick={() => setVal(p.userId, ((parseFloat(p.value) || 1) + 1).toString())}
                              className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-lg font-bold hover:bg-emerald-600 transition-all active:scale-95"
                            >
                              +
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {total > 0 && included.length > 0 && (
                    <p className="text-center text-xs text-slate-400 pt-1 bg-slate-950/80 p-2 rounded-2xl">
                      {getShareTotal()} total shares · {symbol}{total.toFixed(2)} total
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── CURRENCY STEP ─────────────────────────────────────────────────── */}
        {step === 'currency' && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/90">
              <button
                onClick={() => setStep('main')}
                className="text-slate-400 hover:text-slate-100 text-sm font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h2 className="text-base font-bold text-white">Currency</h2>
              <div className="w-12" />
            </div>

            <div className="px-5 py-4 space-y-2">
              {[
                { code: 'INR', name: 'Indian Rupee',   symbol: '₹', gradient: 'from-orange-500 to-red-500' },
                { code: 'USD', name: 'US Dollar',      symbol: '$', gradient: 'from-green-500 to-emerald-500' },
                { code: 'EUR', name: 'Euro',           symbol: '€', gradient: 'from-blue-500 to-cyan-500' },
                { code: 'GBP', name: 'British Pound',  symbol: '£', gradient: 'from-purple-500 to-pink-500' }
              ].map(c => (
                <button
                  key={c.code}
                  onClick={() => { setCurrency(c.code); setStep('main') }}
                  className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-all ${
                    currency === c.code
                      ? `bg-gradient-to-r ${c.gradient} text-white shadow-lg scale-[1.02]`
                      : 'bg-slate-900/80 hover:bg-slate-800 border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${
                      currency === c.code ? 'bg-white/10 text-white' : 'bg-slate-900/80 text-slate-200 shadow'
                    }`}>
                      {c.symbol}
                    </span>
                    <div className="text-left">
                      <p className={`text-sm font-bold ${currency === c.code ? 'text-white' : 'text-slate-100'}`}>
                        {c.code}
                      </p>
                      <p className={`text-xs ${currency === c.code ? 'text-white/80' : 'text-slate-400'}`}>
                        {c.name}
                      </p>
                    </div>
                  </div>
                  {currency === c.code && (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}