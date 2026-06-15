import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import Navbar from '../components/Navbar'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function GroupDetail() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [group, setGroup] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    description: '', amount: '', currency: 'INR',
    splitType: 'equal', expenseDate: '', paidBy: ''
  })

  useEffect(() => { fetchAll() }, [groupId])

  async function fetchAll() {
    try {
      const [gRes, eRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/expenses/${groupId}`)
      ])
      setGroup(gRes.data.group)
      setExpenses(eRes.data.expenses)
      setForm(f => ({ ...f, paidBy: user.id }))
    } catch {
      setError('Failed to load group')
    } finally {
      setLoading(false)
    }
  }

  async function createExpense(e) {
    e.preventDefault()
    try {
      const res = await api.post(`/expenses/${groupId}`, form)
      setExpenses(prev => [res.data.expense, ...prev])
      setShowForm(false)
      setForm(f => ({
        ...f, description: '', amount: '', expenseDate: ''
      }))
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create expense')
    }
  }

  async function deleteExpense(expenseId) {
    if (!window.confirm('Delete this expense?')) return
    try {
      await api.delete(`/expenses/${groupId}/${expenseId}`)
      setExpenses(prev => prev.filter(e => e.id !== expenseId))
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete expense')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
          <div className="h-8 w-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-6"></div>
          <div className="h-32 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg"></div>
          <div className="mt-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg"></div>)}
          </div>
        </div>
      </div>
    )
  }
  if (!group) return <div className="p-8 text-center text-gray-500">Group not found</div>

  const isAdmin = group.memberships?.find(
    m => m.userId === user.id && m.role === 'admin' && !m.leftAt
  )
  const activeMembers = group.memberships?.filter(m => !m.leftAt) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header with gradient back button */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-10 relative">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="group w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-indigo-600 transition-all duration-300 hover:shadow-lg hover:scale-105"
                aria-label="Back to dashboard"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent tracking-tight">
                {group.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 bg-white/60 rounded-full px-3 py-1 w-fit">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              to={`/groups/${groupId}/balances`}
              className="group inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 shadow-sm transition-all duration-200"
            >
              <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Balances
            </Link>
            {isAdmin && (
              <Link
                to={`/groups/${groupId}/import`}
                className="group inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 backdrop-blur-sm border border-purple-200 rounded-xl text-sm font-semibold text-purple-700 hover:from-purple-100 hover:to-pink-100 hover:border-purple-300 shadow-sm transition-all duration-200"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import CSV
              </Link>
            )}
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

        {/* Add expense button - modern dashed card */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full mb-8 py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 text-sm font-bold hover:border-indigo-400 hover:text-indigo-600 transition-all duration-200 flex items-center justify-center gap-3 bg-white/50 backdrop-blur-sm hover:bg-white/80 group"
        >
          <svg className={`w-5 h-5 transition-transform duration-200 ${showForm ? 'rotate-45' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          {showForm ? 'Cancel' : 'Add expense'}
        </button>

        {/* Add expense form - premium card */}
        {showForm && (
          <form onSubmit={createExpense} className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6 mb-10 space-y-5 transition-all">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <span>📝</span> Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-gray-50/50 hover:bg-white shadow-sm"
                  placeholder="Lunch, movie tickets, rent..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <span>💰</span> Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-sm"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <span>🌍</span> Currency
                </label>
                <select
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white shadow-sm"
                >
                  <option value="INR">🇮🇳 INR</option>
                  <option value="USD">🇺🇸 USD</option>
                  <option value="EUR">🇪🇺 EUR</option>
                  <option value="GBP">🇬🇧 GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <span>📅</span> Date
                </label>
                <input
                  type="date"
                  value={form.expenseDate}
                  onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <span>⚖️</span> Split type
                </label>
                <select
                  value={form.splitType}
                  onChange={e => setForm({ ...form, splitType: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white shadow-sm"
                >
                  <option value="equal">Equal</option>
                  <option value="unequal">Exact amounts</option>
                  <option value="percentage">Percentages</option>
                  <option value="share">Shares</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <span>👤</span> Paid by
                </label>
                <select
                  value={form.paidBy}
                  onChange={e => setForm({ ...form, paidBy: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white shadow-sm"
                >
                  {activeMembers.map(m => (
                    <option key={m.userId} value={m.userId}>{m.user.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              + Add expense
            </button>
          </form>
        )}

        {/* Expense list - modern cards */}
        {expenses.length === 0 ? (
          <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-200 shadow-inner">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-5 shadow-md">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-gray-800 font-bold text-xl mb-1">No expenses yet</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Click the "Add expense" button above to start tracking shared costs.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map(expense => {
              const myShare = expense.splits?.find(s => s.userId === user.id)
              const iPaid = expense.paidBy === user.id
              const net = iPaid
                ? parseFloat(expense.amountInr) - (parseFloat(myShare?.shareAmount) || 0)
                : -(parseFloat(myShare?.shareAmount) || 0)
              const showNet = myShare && Math.abs(net) > 0.01
              return (
                <div
                  key={expense.id}
                  className="group bg-white/95 backdrop-blur-sm rounded-2xl shadow-md border border-gray-100 p-5 transition-all duration-300 hover:shadow-xl hover:scale-[1.01]"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between sm:block">
                        <p className="font-extrabold text-gray-800 text-lg">{expense.description}</p>
                        <div className="sm:hidden text-right">
                          <p className="text-lg font-extrabold text-gray-900">₹{parseFloat(expense.amountInr).toFixed(2)}</p>
                          {expense.currency !== 'INR' && (
                            <p className="text-xs text-gray-400">{expense.currency} {parseFloat(expense.amountOriginal).toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-2">
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(expense.expenseDate).toLocaleDateString('en-IN')}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          paid by {expense.payer?.name}
                        </span>
                        <span>·</span>
                        <span className="capitalize font-medium bg-gray-100 px-2 py-0.5 rounded-full">{expense.splitType} split</span>
                        {showNet && (
                          <>
                            <span>·</span>
                            <span className={`font-semibold ${net > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                              {net > 0 ? `you get ₹${net.toFixed(2)}` : `you owe ₹${Math.abs(net).toFixed(2)}`}
                            </span>
                          </>
                        )}
                      </div>
                      {/* Split breakdown chips */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {expense.splits?.map(split => (
                          <span key={split.id} className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full shadow-sm">
                            {split.user?.name}: <span className="font-mono font-bold">₹{parseFloat(split.shareAmount).toFixed(2)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="hidden sm:block text-right">
                      <p className="text-xl font-extrabold text-gray-900">₹{parseFloat(expense.amountInr).toFixed(2)}</p>
                      {expense.currency !== 'INR' && (
                        <p className="text-xs text-gray-400">{expense.currency} {parseFloat(expense.amountOriginal).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                  {(isAdmin || expense.payer?.id === user.id) && (
                    <div className="flex justify-end mt-4 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="text-xs font-semibold text-red-500 hover:text-white transition-all duration-200 hover:bg-red-500 px-3 py-1 rounded-full border border-red-200 hover:border-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}