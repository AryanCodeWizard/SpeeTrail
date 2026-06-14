import { useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function BalancePanel({ groupId, data, onSettled }) {
  const { user } = useAuth()
  const [settling, setSettling] = useState(null) // transaction object
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null) // userId for breakdown

  async function handleSettle(transaction) {
    setLoading(true)
    try {
      await api.post(`/settlements/${groupId}`, {
        paidTo: transaction.to.id,
        amount: transaction.amount,
        settledOn: new Date().toISOString().split('T')[0]
      })
      toast.success(`Payment of ₹${transaction.amount} recorded`)
      setSettling(null)
      onSettled()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-200 to-purple-200 rounded-full"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
          <p className="text-sm text-gray-400">Loading balances...</p>
        </div>
      </div>
    )
  }

  const myBalance = data.balances[user?.id]

  return (
    <div className="space-y-6">
      {/* My balance summary card - colorful gradient */}
      {myBalance && (
        <div className={`
          rounded-2xl p-6 text-center shadow-lg transition-all duration-300 transform hover:scale-[1.01]
          ${myBalance.net > 0.005
            ? 'bg-gradient-to-br from-green-400 to-emerald-600 text-white'
            : myBalance.net < -0.005
              ? 'bg-gradient-to-br from-red-400 to-rose-600 text-white'
              : 'bg-gradient-to-br from-gray-400 to-slate-500 text-white'}
        `}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="bg-white/20 rounded-full p-1.5">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-white/90 uppercase tracking-wide">Your balance</p>
          </div>
          <p className="text-4xl font-extrabold mt-1 drop-shadow-sm">
            {myBalance.net > 0.005
              ? `+₹${myBalance.net.toFixed(2)}`
              : myBalance.net < -0.005
                ? `-₹${Math.abs(myBalance.net).toFixed(2)}`
                : 'Settled up ✨'}
          </p>
          <p className="text-xs text-white/80 mt-2 font-medium">
            {myBalance.net > 0.005
              ? '🎉 Others owe you'
              : myBalance.net < -0.005
                ? '💸 You owe others'
                : 'All balanced! 🎯'}
          </p>
        </div>
      )}

      {/* Suggested settlements section - colorful cards */}
      {data.transactions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Suggested payments</h3>
          </div>
          <div className="space-y-3">
            {data.transactions.map((t, i) => {
              const isMe = t.from.id === user?.id
              return (
                <div
                  key={i}
                  className={`
                    p-4 rounded-xl border transition-all duration-300 hover:shadow-md
                    ${isMe
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                      : 'bg-white border-gray-100 hover:border-purple-200'}
                  `}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                        isMe ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {t.from.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-semibold ${isMe ? 'text-amber-800' : 'text-gray-800'}`}>
                        {t.from.name}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                        t.to.id === user?.id ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {t.to.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-semibold ${t.to.id === user?.id ? 'text-green-700' : 'text-gray-800'}`}>
                        {t.to.name}
                      </span>
                      <span className="ml-1 font-extrabold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                        ₹{t.amount.toFixed(2)}
                      </span>
                    </div>

                    {isMe && (
                      <button
                        onClick={() => setSettling(t)}
                        className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-1.5 rounded-full font-semibold transition-all shadow-sm active:scale-95"
                      >
                        ✓ Mark paid
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {data.transactions.length === 0 && (
        <div className="text-center py-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-3 shadow-md animate-bounce">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-green-800 font-bold text-lg">All settled up! 🎉</p>
          <p className="text-sm text-green-600 mt-1">No outstanding payments</p>
        </div>
      )}

      {/* All balances with drill-down - colorful list */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">All balances</h3>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-md">
          {Object.values(data.balances).map((b, idx) => {
            const isExpanded = expanded === b.user?.id
            const isCurrentUser = b.user?.id === user?.id
            return (
              <div key={b.user?.id} className="transition-all duration-200">
                <button
                  onClick={() => setExpanded(isExpanded ? null : b.user?.id)}
                  className={`
                    w-full flex items-center justify-between p-4 transition-all duration-200
                    ${idx !== Object.values(data.balances).length - 1 ? 'border-b border-gray-50' : ''}
                    hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100
                    ${isCurrentUser ? 'bg-gradient-to-r from-blue-50/50 to-cyan-50/50' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all
                      ${isCurrentUser 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' 
                        : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700'}
                    `}>
                      {b.user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-semibold text-gray-800">
                        {b.user?.name}
                        {isCurrentUser && <span className="ml-1.5 text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">you</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`
                      text-sm font-bold px-2.5 py-1 rounded-full shadow-sm
                      ${b.net > 0.005 
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200' 
                        : b.net < -0.005 
                          ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200' 
                          : 'bg-gray-100 text-gray-500 border border-gray-200'}
                    `}>
                      {b.net > 0.005 ? `+₹${b.net.toFixed(2)}`
                      : b.net < -0.005 ? `-₹${Math.abs(b.net).toFixed(2)}`
                      : '₹0'}
                    </span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-purple-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Drill-down breakdown with gradient */}
                {isExpanded && data.expenseBreakdown[b.user?.id]?.length > 0 && (
                  <div className="bg-gradient-to-b from-gray-50/80 to-white px-5 pb-4 pt-2 border-t border-gray-100">
                    <div className="ml-11 space-y-2">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                        <span>📋</span> Expense breakdown
                      </p>
                      {data.expenseBreakdown[b.user?.id].map((entry, i) => (
                        <div key={i} className="flex justify-between items-center text-xs py-2 border-b border-gray-100 last:border-0 hover:bg-white/50 rounded-lg px-2 transition-colors">
                          <div className="flex-1 mr-3">
                            <p className="text-gray-700 font-medium">{entry.description}</p>
                            <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5">
                              <span className="flex items-center gap-0.5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </span>
                              <span>•</span>
                              <span className={`capitalize font-medium ${entry.role === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                                {entry.role}
                              </span>
                            </div>
                          </div>
                          <span className={`font-bold text-sm ${entry.role === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                            {entry.role === 'paid' ? '+' : '−'}₹{Math.abs(entry.amount).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Confirm settlement modal - colorful */}
      {settling && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border-t-4 border-t-amber-500">
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mx-auto mb-4 shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Confirm Payment</h3>
            <p className="text-sm text-gray-600 text-center mb-5">
              <span className="font-semibold text-gray-800">{settling.from.name}</span> will pay{' '}
              <span className="font-semibold text-gray-800">{settling.to.name}</span>
            </p>
            <div className="bg-amber-50 rounded-xl p-3 text-center mb-5">
              <span className="text-2xl font-extrabold text-amber-600">₹{settling.amount.toFixed(2)}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSettling(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSettle(settling)}
                disabled={loading}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  '✓ Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}