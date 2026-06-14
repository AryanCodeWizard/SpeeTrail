import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import Navbar from '../components/Navbar'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function GroupDetail() {
  const { groupId }  = useParams()
  const { user }     = useAuth()
  const navigate     = useNavigate()

  const [group,    setGroup]    = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
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
      // Default paidBy to current user
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>
  if (!group)  return <div className="p-8 text-center text-gray-500">Group not found</div>

  const isAdmin = group.memberships?.find(
    m => m.userId === user.id && m.role === 'admin' && !m.leftAt
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">{group.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {group.memberships?.filter(m => !m.leftAt).length} active members
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/groups/${groupId}/balances`}
              className="text-sm bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded hover:bg-green-100"
            >
              Balances
            </Link>
            {isAdmin && (
              <Link
                to={`/groups/${groupId}/import`}
                className="text-sm bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded hover:bg-purple-100"
              >
                Import CSV
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
        )}

        {/* Add expense button */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full mb-4 py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg text-sm hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add expense'}
        </button>

        {/* Add expense form */}
        {showForm && (
          <form
            onSubmit={createExpense}
            className="bg-white border border-gray-200 rounded-lg p-4 mb-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Currency
                </label>
                <select
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={form.expenseDate}
                  onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Split type
                </label>
                <select
                  value={form.splitType}
                  onChange={e => setForm({ ...form, splitType: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="equal">Equal</option>
                  <option value="unequal">Unequal</option>
                  <option value="percentage">Percentage</option>
                  <option value="share">By share</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Paid by
                </label>
                <select
                  value={form.paidBy}
                  onChange={e => setForm({ ...form, paidBy: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {group.memberships
                    ?.filter(m => !m.leftAt)
                    .map(m => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700"
            >
              Add expense
            </button>
          </form>
        )}

        {/* Expense list */}
        {expenses.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No expenses yet.
          </p>
        ) : (
          <div className="space-y-3">
            {expenses.map(expense => (
              <div
                key={expense.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">
                      {expense.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(expense.expenseDate).toLocaleDateString('en-IN')}
                      {' · '}paid by {expense.payer?.name}
                      {' · '}{expense.splitType} split
                    </p>
                    {/* Split breakdown — Rohan's requirement */}
                    <div className="mt-2 space-y-0.5">
                      {expense.splits?.map(split => (
                        <p key={split.id} className="text-xs text-gray-500">
                          {split.user?.name}: ₹{parseFloat(split.shareAmount).toFixed(2)}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-gray-800">
                      ₹{parseFloat(expense.amountInr).toFixed(2)}
                    </p>
                    {expense.currency !== 'INR' && (
                      <p className="text-xs text-gray-400">
                        {expense.currency} {parseFloat(expense.amountOriginal).toFixed(2)}
                      </p>
                    )}
                    {(isAdmin || expense.payer?.id === user.id) && (
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="text-xs text-red-400 hover:text-red-600 mt-1"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}