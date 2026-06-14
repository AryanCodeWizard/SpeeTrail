import { useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function ExpenseFeed({ groupId, expenses, isAdmin, onDeleted, onExport }) {
  const { user }  = useAuth()
  const [deleting, setDeleting] = useState(null)

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
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="text-5xl mb-3">🧾</div>
        <p className="text-sm">No expenses yet</p>
        <p className="text-xs mt-1">Add one using the button above</p>
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

  return (
    <div>
      {/* Export button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 border border-gray-200 hover:border-teal-400 px-3 py-1.5 rounded-lg transition-colors"
        >
          <span>↓</span> Export CSV
        </button>
      </div>

      {/* Expense list grouped by month */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([month, monthExpenses]) => (
          <div key={month}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {month}
              </h3>
              <div className="flex-1 border-t border-gray-100" />
              <span className="text-xs text-gray-400">
                ₹{monthExpenses.reduce((s, e) => s + parseFloat(e.amountInr), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="space-y-2">
              {monthExpenses.map(expense => {
                const myShare = expense.splits?.find(s => s.userId === user?.id)
                const iPaid   = expense.paidBy === user?.id
                const net     = iPaid
                  ? parseFloat(expense.amountInr) - (parseFloat(myShare?.shareAmount) || 0)
                  : -(parseFloat(myShare?.shareAmount) || 0)

                return (
                  <div
                    key={expense.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">

                      {/* Left: description + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {expense.description}
                          </p>
                          {expense.isSettlement && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex-shrink-0">
                              settlement
                            </span>
                          )}
                          {expense.currency !== 'INR' && (
                            <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded flex-shrink-0">
                              {expense.currency}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(expense.expenseDate).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short'
                          })}
                          {' · '}
                          {expense.payer?.name} paid
                          {' · '}
                          {expense.splitType} split
                        </p>

                        {/* Split breakdown */}
                        <div className="flex flex-wrap gap-x-3 mt-1.5">
                          {expense.splits?.map(split => (
                            <span key={split.id} className="text-xs text-gray-400">
                              {split.user?.name}: ₹{parseFloat(split.shareAmount).toFixed(0)}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right: amount + your share */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-800">
                          ₹{parseFloat(expense.amountInr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                        {expense.currency !== 'INR' && (
                          <p className="text-xs text-gray-400">
                            {expense.currency} {parseFloat(expense.amountOriginal).toFixed(2)}
                          </p>
                        )}
                        {myShare && (
                          <p className={`text-xs mt-0.5 font-medium ${
                            net > 0 ? 'text-green-600' : net < 0 ? 'text-red-500' : 'text-gray-400'
                          }`}>
                            {net > 0
                              ? `you get back ₹${net.toFixed(0)}`
                              : net < 0
                                ? `you owe ₹${Math.abs(net).toFixed(0)}`
                                : 'settled'}
                          </p>
                        )}

                        {/* Delete */}
                        {(isAdmin || expense.paidBy === user?.id) && (
                          <button
                            onClick={() => handleDelete(expense.id, expense.description)}
                            disabled={deleting === expense.id}
                            className="text-xs text-red-300 hover:text-red-500 mt-1 block ml-auto"
                          >
                            {deleting === expense.id ? '...' : 'delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}