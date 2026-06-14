import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import Navbar from '../components/Navbar'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Balances() {
  const { groupId } = useParams()
  const { user }    = useAuth()

  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [selected, setSelected] = useState(null) // userId for drill-down
  const [drill,    setDrill]    = useState(null)
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-gray-800">Balances</h1>
          <Link
            to={`/groups/${groupId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
        )}

        {data && (
          <>
            {/* Aisha's view — simplified transactions */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Suggested settlements
              </h2>
              {data.transactions.length === 0 ? (
                <p className="text-sm text-green-600">Everyone is settled up.</p>
              ) : (
                <div className="space-y-2">
                  {data.transactions.map((t, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-700">
                        <span className="font-medium">{t.from.name}</span>
                        {' pays '}
                        <span className="font-medium">{t.to.name}</span>
                      </span>
                      <span className="font-semibold text-gray-800">
                        ₹{t.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Net balances — click for drill-down */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Net balances
                <span className="font-normal text-gray-400 ml-1">
                  (click to see breakdown)
                </span>
              </h2>
              <div className="space-y-2">
                {Object.values(data.balances).map(b => (
                  <div
                    key={b.user?.id}
                    onClick={() => fetchDrilldown(b.user?.id)}
                    className={`flex justify-between items-center p-2 rounded cursor-pointer hover:bg-gray-50 ${
                      selected === b.user?.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="text-sm text-gray-700">{b.user?.name}</span>
                    <span className={`text-sm font-semibold ${
                      b.net > 0 ? 'text-green-600'
                      : b.net < 0 ? 'text-red-500'
                      : 'text-gray-400'
                    }`}>
                      {b.net > 0 ? '+' : ''}₹{b.net.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rohan's drill-down */}
            {drill && selected && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  Breakdown for {data.balances[selected]?.user?.name}
                </h2>
                <div className="space-y-1.5">
                  {drill.breakdown.map((entry, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="text-gray-700">{entry.description}</span>
                        <span className="text-gray-400 ml-1">
                          · {new Date(entry.date).toLocaleDateString('en-IN')}
                          · {entry.role}
                        </span>
                      </div>
                      <span className={
                        entry.role === 'paid'
                          ? 'text-green-600 font-medium'
                          : 'text-red-500 font-medium'
                      }>
                        {entry.role === 'paid' ? '+' : ''}
                        ₹{Math.abs(entry.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Record settlement */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  Record a payment
                </h2>
                <button
                  onClick={() => setSettling(!settling)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {settling ? 'Cancel' : 'Record payment'}
                </button>
              </div>

              {settling && (
                <form onSubmit={recordSettlement} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Paid to
                      </label>
                      <select
                        value={settleForm.paidTo}
                        onChange={e => setSettleForm({ ...settleForm, paidTo: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={settleForm.amount}
                        onChange={e => setSettleForm({ ...settleForm, amount: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={settleForm.settledOn}
                        onChange={e => setSettleForm({ ...settleForm, settledOn: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-2 rounded text-sm font-medium hover:bg-green-700"
                  >
                    Record payment
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}