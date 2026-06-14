import { useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function BalancePanel({ groupId, data, onSettled }) {
  const { user } = useAuth()
  const [settling, setSettling] = useState(null) // transaction object
  const [loading,  setLoading]  = useState(false)
  const [expanded, setExpanded] = useState(null) // userId for breakdown

  async function handleSettle(transaction) {
    setLoading(true)
    try {
      await api.post(`/settlements/${groupId}`, {
        paidTo:    transaction.to.id,
        amount:    transaction.amount,
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
      <div className="text-center py-10 text-gray-400 text-sm">
        Loading balances...
      </div>
    )
  }

  const myBalance = data.balances[user?.id]

  return (
    <div className="space-y-5">

      {/* My balance summary */}
      {myBalance && (
        <div className={`rounded-xl p-4 text-center ${
          myBalance.net > 0.005
            ? 'bg-green-50 border border-green-200'
            : myBalance.net < -0.005
              ? 'bg-red-50 border border-red-200'
              : 'bg-gray-50 border border-gray-200'
        }`}>
          <p className="text-xs text-gray-500 mb-1">Your balance</p>
          <p className={`text-2xl font-bold ${
            myBalance.net > 0.005  ? 'text-green-600'
            : myBalance.net < -0.005 ? 'text-red-500'
            : 'text-gray-500'
          }`}>
            {myBalance.net > 0.005
              ? `+₹${myBalance.net.toFixed(2)}`
              : myBalance.net < -0.005
                ? `-₹${Math.abs(myBalance.net).toFixed(2)}`
                : 'Settled up'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {myBalance.net > 0.005
              ? 'others owe you'
              : myBalance.net < -0.005
                ? 'you owe others'
                : 'all good!'}
          </p>
        </div>
      )}

      {/* Suggested settlements — Aisha's view */}
      {data.transactions.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Suggested payments
          </h3>
          <div className="space-y-2">
            {data.transactions.map((t, i) => {
              const isMe = t.from.id === user?.id

              return (
                <div
                  key={i}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    isMe
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="text-sm">
                    <span className={isMe ? 'font-semibold text-orange-700' : 'text-gray-700'}>
                      {t.from.name}
                    </span>
                    <span className="text-gray-400 mx-1.5">→</span>
                    <span className={!isMe && t.to.id === user?.id ? 'font-semibold text-green-700' : 'text-gray-700'}>
                      {t.to.name}
                    </span>
                    <span className="ml-2 font-semibold text-gray-800">
                      ₹{t.amount.toFixed(2)}
                    </span>
                  </div>

                  {/* Mark as paid — only the payer can do this */}
                  {isMe && (
                    <button
                      onClick={() => setSettling(t)}
                      className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded hover:bg-orange-600"
                    >
                      Mark paid
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {data.transactions.length === 0 && (
        <div className="text-center py-4 text-green-600 text-sm">
          🎉 Everyone is settled up!
        </div>
      )}

      {/* All balances — click for drill-down */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          All balances
        </h3>
        <div className="space-y-1">
          {Object.values(data.balances).map(b => (
            <div key={b.user?.id}>
              <button
                onClick={() => setExpanded(expanded === b.user?.id ? null : b.user?.id)}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-semibold">
                    {b.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700">{b.user?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${
                    b.net > 0.005  ? 'text-green-600'
                    : b.net < -0.005 ? 'text-red-500'
                    : 'text-gray-400'
                  }`}>
                    {b.net > 0.005  ? `+₹${b.net.toFixed(2)}`
                    : b.net < -0.005 ? `-₹${Math.abs(b.net).toFixed(2)}`
                    : '₹0'}
                  </span>
                  <span className="text-gray-300 text-xs">
                    {expanded === b.user?.id ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {/* Drill-down — Rohan's requirement */}
              {expanded === b.user?.id && data.expenseBreakdown[b.user?.id]?.length > 0 && (
                <div className="ml-9 mb-2 space-y-1">
                  {data.expenseBreakdown[b.user?.id].map((entry, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-500 py-0.5">
                      <span className="truncate flex-1 mr-2">
                        {entry.description}
                        <span className="text-gray-300 ml-1">
                          · {new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          · {entry.role}
                        </span>
                      </span>
                      <span className={entry.role === 'paid' ? 'text-green-600' : 'text-red-500'}>
                        {entry.role === 'paid' ? '+' : ''}₹{Math.abs(entry.amount).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirm settlement modal */}
      {settling && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-2">Confirm payment</h3>
            <p className="text-sm text-gray-600 mb-4">
              Record that{' '}
              <span className="font-medium">{settling.from.name}</span>
              {' '}paid{' '}
              <span className="font-medium">{settling.to.name}</span>
              {' '}₹{settling.amount.toFixed(2)}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSettling(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSettle(settling)}
                disabled={loading}
                className="flex-1 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
              >
                {loading ? 'Recording...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}