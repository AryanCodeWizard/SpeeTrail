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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded-lg mb-6"></div>
          <div className="h-32 bg-white rounded-xl shadow-sm"></div>
          <div className="mt-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl shadow-sm"></div>)}
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Back to dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                {group.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/groups/${groupId}/balances`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Balances
            </Link>
            {isAdmin && (
              <Link
                to={`/groups/${groupId}/import`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-100 shadow-sm transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import CSV
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 text-sm flex items-start gap-3" role="alert">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Add expense button */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full mb-6 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm font-medium hover:border-blue-400 hover:text-blue-600 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <svg className={`w-5 h-5 transition-transform ${showForm ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showForm ? 'Cancel' : 'Add expense'}
        </button>

        {/* Add expense form */}
        {showForm && (
          <form onSubmit={createExpense} className="bg-white rounded-xl shadow-md border border-gray-100 p-5 mb-8 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 hover:bg-white"
                  placeholder="Lunch, movie tickets, rent..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Currency</label>
                <select
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Date</label>
                <input
                  type="date"
                  value={form.expenseDate}
                  onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Split type</label>
                <select
                  value={form.splitType}
                  onChange={e => setForm({ ...form, splitType: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="equal">Equal</option>
                  <option value="unequal">Unequal</option>
                  <option value="percentage">Percentage</option>
                  <option value="share">By share</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Paid by</label>
                <select
                  value={form.paidBy}
                  onChange={e => setForm({ ...form, paidBy: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                >
                  {activeMembers.map(m => (
                    <option key={m.userId} value={m.userId}>{m.user.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-sm active:scale-[0.98]"
            >
              Add expense
            </button>
          </form>
        )}

        {/* Expense list */}
        {expenses.length === 0 ? (
          <div className="text-center py-12 bg-white/50 rounded-xl border border-dashed border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-gray-900 font-medium text-lg mb-1">No expenses yet</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Click the "Add expense" button above to start tracking shared costs.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map(expense => (
              <div key={expense.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 transition-all hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-start justify-between sm:block">
                      <p className="font-semibold text-gray-900">{expense.description}</p>
                      <div className="sm:hidden text-right">
                        <p className="font-bold text-gray-900">₹{parseFloat(expense.amountInr).toFixed(2)}</p>
                        {expense.currency !== 'INR' && (
                          <p className="text-xs text-gray-400">{expense.currency} {parseFloat(expense.amountOriginal).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(expense.expenseDate).toLocaleDateString('en-IN')}
                      </span>
                      <span>·</span>
                      <span>paid by {expense.payer?.name}</span>
                      <span>·</span>
                      <span className="capitalize">{expense.splitType} split</span>
                    </div>
                    {/* Split breakdown */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {expense.splits?.map(split => (
                        <span key={split.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                          {split.user?.name}: ₹{parseFloat(split.shareAmount).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="font-bold text-gray-900">₹{parseFloat(expense.amountInr).toFixed(2)}</p>
                    {expense.currency !== 'INR' && (
                      <p className="text-xs text-gray-400">{expense.currency} {parseFloat(expense.amountOriginal).toFixed(2)}</p>
                    )}
                  </div>
                </div>
                {(isAdmin || expense.payer?.id === user.id) && (
                  <div className="flex justify-end mt-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => deleteExpense(expense.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}