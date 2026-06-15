import { useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function ExpenseFeed({ groupId, expenses, isAdmin, onDeleted, onExport }) {
  const { user } = useAuth()
  const [deleting, setDeleting] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  async function handleDelete(expenseId, description) {
    if (!window.confirm(`Delete "${description}"?`)) return
    setDeleting(expenseId)
    try {
      await api.delete(`/expenses/${groupId}/${expenseId}`)
      onDeleted(expenseId)
      toast.success('Expense deleted')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-28 h-28 bg-slate-900/80 rounded-full flex items-center justify-center mb-6 shadow-2xl ring-1 ring-white/10 animate-pulse">
          <svg className="w-14 h-14 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h3 className="text-slate-100 font-bold text-xl mb-1">✨ No expenses yet</h3>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          Add your first expense using the button above to start tracking shared costs.
        </p>
      </div>
    )
  }

  // Group expenses by month
  const grouped = expenses.reduce((acc, expense) => {
    const month = new Date(expense.expenseDate)
      .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    if (!acc[month]) acc[month] = []
    acc[month].push(expense)
    return acc
  }, {})

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div>
      {/* Export button - modern gradient */}
      <div className="flex justify-end mb-6">
        <button
          onClick={onExport}
          className="btn-primary"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
          <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></span>
        </button>
      </div>

      {/* Expense list grouped by month */}
      <div className="space-y-8">
        {Object.entries(grouped).map(([month, monthExpenses]) => {
          const monthTotal = monthExpenses.reduce((s, e) => s + parseFloat(e.amountInr), 0)
          return (
            <div key={month}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 tracking-wide">{month}</h3>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-700 via-slate-600 to-transparent" />
                <span className="text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-500 px-3 py-1 rounded-full shadow-md">
                  ₹{monthTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="space-y-3 section-surface border border-white/10 p-4 rounded-[1.75rem]">
                {monthExpenses.map(expense => {
                  const myShare = expense.splits?.find(s => s.userId === user?.id)
                  const iPaid = expense.paidBy === user?.id
                  const net = iPaid
                    ? parseFloat(expense.amountInr) - (parseFloat(myShare?.shareAmount) || 0)
                    : -(parseFloat(myShare?.shareAmount) || 0)
                  const showNet = myShare && Math.abs(net) > 0.01
                  const isExpanded = expandedId === expense.id

                  return (
                    <div
                      key={expense.id}
                      className={`group rounded-3xl border transition-all duration-300 ${
                        isExpanded 
                          ? 'bg-slate-900/90 border-cyan-500/10 shadow-[0_30px_80px_rgba(8,145,178,0.18)] scale-[1.01]' 
                          : 'bg-slate-950/80 border-white/10 shadow-md hover:shadow-xl hover:border-slate-700'
                      }`}
                    >
                      {/* Compact view - always visible */}
                      <div
                        onClick={() => toggleExpand(expense.id)}
                        className="p-4 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-base font-extrabold text-slate-100 truncate">
                                {expense.description}
                              </p>
                              {expense.isSettlement && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  settle
                                </span>
                              )}
                              {expense.currency !== 'INR' && (
                                <span className="text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                                  {expense.currency}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5">
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(expense.expenseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </span>
                              {showNet && (
                                <>
                                  <span className="text-slate-500">•</span>
                                  <span className={`flex items-center gap-1 font-bold ${net > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {net > 0 ? (
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                      </svg>
                                    ) : (
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                                      </svg>
                                    )}
                                    {net > 0 ? `you get ₹${net.toFixed(2)}` : `you owe ₹${Math.abs(net).toFixed(2)}`}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xl font-extrabold text-slate-100">
                              ₹{parseFloat(expense.amountInr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className={`text-xs font-semibold transition-all duration-200 ${isExpanded ? 'text-indigo-400' : 'text-slate-400'}`}>
                                {isExpanded ? '▲ Less' : '▼ More'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded details with gradient background */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-800 bg-slate-950/90 rounded-b-3xl animate-in slide-down duration-200">
                          <div className="space-y-3 text-sm">
                            {/* Paid by row */}
                            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-900/90 shadow-sm border border-white/10">
                              <span className="text-slate-400 flex items-center gap-2">
                                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Paid by
                              </span>
                              <span className="font-bold text-slate-100">{expense.payer?.name}</span>
                            </div>
                            {/* Split type row */}
                            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-900/90 shadow-sm border border-white/10">
                              <span className="text-slate-400 flex items-center gap-2">
                                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5 5a2 2 0 01.586 1.414V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                                </svg>
                                Split type
                              </span>
                              <span className="font-bold text-slate-100 capitalize">{expense.splitType}</span>
                            </div>
                            {/* Split breakdown - premium card */}
                            <div className="mt-3">
                              <span className="text-slate-400 block mb-2 ml-1 text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                <span>🔗</span> Split details
                              </span>
                              <div className="bg-slate-900/90 rounded-2xl p-3 shadow-md border border-white/10 divide-y divide-slate-800">
                                {expense.splits?.map(split => (
                                  <div key={split.id} className="flex justify-between items-center py-2.5 px-2 first:pt-1 last:pb-1">
                                    <span className="text-slate-100 font-semibold">{split.user?.name}</span>
                                    <span className="font-mono font-bold text-slate-100 bg-slate-800/80 px-2 py-0.5 rounded-full shadow-inner">₹{parseFloat(split.shareAmount).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Original amount if not INR */}
                            {expense.currency !== 'INR' && (
                              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-900/90 border border-white/10">
                                <span className="text-amber-300 flex items-center gap-2 text-xs font-semibold">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Original amount
                                </span>
                                <span className="font-mono font-bold text-amber-200 bg-slate-800/80 px-2 py-0.5 rounded-full text-sm shadow-sm">{expense.currency} {parseFloat(expense.amountOriginal).toFixed(2)}</span>
                              </div>
                            )}
                            {/* Delete button - premium style */}
                            {(isAdmin || expense.paidBy === user?.id) && (
                              <div className="pt-4 flex justify-end">
                                <button
                                  onClick={() => handleDelete(expense.id, expense.description)}
                                  disabled={deleting === expense.id}
                                  className="text-xs font-semibold text-red-500 hover:text-white transition-all duration-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500 border border-red-200 hover:border-red-500"
                                >
                                  {deleting === expense.id ? (
                                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  )}
                                  <span>Delete expense</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-in {
          animation: slide-down 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  )
}