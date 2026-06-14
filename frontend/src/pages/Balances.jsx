import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import Navbar from '../components/Navbar'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Balances() {
  const { groupId } = useParams()
  const { user } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null) // userId for drill-down
  const [drill, setDrill] = useState(null)
  const [settling, setSettling] = useState(false)
  const [settleForm, setSettleForm] = useState({
    paidTo: '', amount: '', settledOn: new Date().toISOString().split('T')[0]
  })

  useEffect(() => { fetchBalances() }, [groupId])

  async function fetchBalances() {
    try {
      const res = await api.get(`/balances/${groupId}`)
      setData(res.data)
    } catch {
      setError('Failed to load balances')
    } finally {
      setLoading(false)
    }
  }

  async function fetchDrilldown(userId) {
    setSelected(userId)
    try {
      const res = await api.get(`/balances/${groupId}/user/${userId}`)
      setDrill(res.data)
    } catch {
      setError('Failed to load breakdown')
    }
  }

  async function recordSettlement(e) {
    e.preventDefault()
    try {
      await api.post(`/settlements/${groupId}`, settleForm)
      setSettling(false)
      setSettleForm({
        paidTo: '', amount: '',
        settledOn: new Date().toISOString().split('T')[0]
      })
      fetchBalances()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record settlement')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
          <div className="h-8 w-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-8"></div>
          <div className="space-y-5">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white/80 rounded-2xl shadow-lg p-6">
                <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-12 bg-gray-100 rounded-xl"></div>
                  <div className="h-12 bg-gray-100 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header with animated back button */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link
              to={`/groups/${groupId}`}
              className="group w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-indigo-600 transition-all duration-300 hover:shadow-lg hover:scale-105"
              aria-label="Back to group"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent tracking-tight">
              Balances
            </h1>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-xl text-red-700 text-sm flex items-start gap-3 shadow-sm" role="alert">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {data && (
          <div className="space-y-8">
            {/* Suggested settlements card - premium design */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden transition-all hover:shadow-2xl">
              <div className="px-6 pt-5 pb-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Suggested settlements</h2>
                </div>
              </div>
              <div className="p-6">
                {data.transactions.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-green-600 bg-green-50 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold">Everyone is settled up. No payments needed.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.transactions.map((t, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap justify-between items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center text-xs font-bold">
                            {t.from.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-gray-800">{t.from.name}</span>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                            {t.to.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-gray-800">{t.to.name}</span>
                        </div>
                        <span className="text-lg font-extrabold text-gray-900 bg-white px-3 py-1 rounded-full shadow-inner">
                          ₹{t.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Net balances card - colorful interactive */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
              <div className="px-6 pt-5 pb-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Net balances</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">click to see breakdown</span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {Object.values(data.balances).map(b => {
                  const isSelected = selected === b.user?.id
                  return (
                    <div
                      key={b.user?.id}
                      onClick={() => fetchDrilldown(b.user?.id)}
                      className={`
                        group flex justify-between items-center p-4 cursor-pointer transition-all duration-300
                        ${isSelected 
                          ? 'bg-gradient-to-r from-indigo-50 to-purple-50 shadow-inner' 
                          : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'}
                      `}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && fetchDrilldown(b.user?.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-md transition-all duration-200
                          ${isSelected 
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white ring-2 ring-white' 
                            : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 group-hover:from-teal-400 group-hover:to-emerald-400 group-hover:text-white'}
                        `}>
                          {b.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className={`text-sm font-semibold ${isSelected ? 'text-indigo-800' : 'text-gray-800'}`}>
                          {b.user?.name}
                        </span>
                      </div>
                      <span className={`
                        text-sm font-bold px-3 py-1 rounded-full shadow-sm
                        ${b.net > 0 
                          ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200' 
                          : b.net < 0 
                            ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200' 
                            : 'bg-gray-100 text-gray-500 border border-gray-200'}
                      `}>
                        {b.net > 0 ? '+' : ''}₹{b.net.toFixed(2)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Drill-down breakdown - animated slide */}
            {drill && selected && data.balances[selected] && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-100 overflow-hidden transition-all duration-300 animate-in slide-up">
                <div className="px-6 pt-5 pb-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                      Breakdown for {data.balances[selected]?.user?.name}
                    </h2>
                  </div>
                </div>
                <div className="p-5">
                  <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                    {drill.breakdown.map((entry, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap justify-between items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-800">{entry.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-0.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(entry.date).toLocaleDateString('en-IN')}
                            </span>
                            <span>•</span>
                            <span className={`font-semibold ${entry.role === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                              {entry.role === 'paid' ? 'Paid' : 'Owed'}
                            </span>
                          </div>
                        </div>
                        <span className={`
                          text-base font-extrabold
                          ${entry.role === 'paid' ? 'text-green-600' : 'text-red-500'}
                        `}>
                          {entry.role === 'paid' ? '+' : '−'}₹{Math.abs(entry.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Record settlement card - premium form */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
              <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Record a payment</h2>
                </div>
                <button
                  onClick={() => setSettling(!settling)}
                  className="text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 px-3 py-1.5 rounded-full shadow-md transition-all hover:shadow-lg"
                >
                  {settling ? 'Cancel' : '+ Add payment'}
                </button>
              </div>

              {settling && (
                <form onSubmit={recordSettlement} className="p-6 space-y-5 animate-in slide-down duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                        Paid to
                      </label>
                      <select
                        value={settleForm.paidTo}
                        onChange={e => setSettleForm({ ...settleForm, paidTo: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-white shadow-sm"
                        required
                      >
                        <option value="">Select person</option>
                        {Object.values(data.balances)
                          .filter(b => b.user?.id !== user.id)
                          .map(b => (
                            <option key={b.user?.id} value={b.user?.id}>
                              {b.user?.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={settleForm.amount}
                        onChange={e => setSettleForm({ ...settleForm, amount: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all shadow-sm"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                        Date
                      </label>
                      <input
                        type="date"
                        value={settleForm.settledOn}
                        onChange={e => setSettleForm({ ...settleForm, settledOn: e.target.value })}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all shadow-sm"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
                  >
                    Record payment
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #94a3b8, #64748b);
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
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
          animation-duration: 0.3s;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          animation-fill-mode: both;
        }
        .slide-up {
          animation-name: slide-up;
        }
        .slide-down {
          animation-name: slide-down;
        }
      `}</style>
    </div>
  )
}