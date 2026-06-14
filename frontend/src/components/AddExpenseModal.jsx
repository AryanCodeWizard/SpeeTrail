import { useState, useEffect } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function AddExpenseModal({ groupId, members, onClose, onAdded }) {
  const { user } = useAuth()

  const [form, setForm] = useState({
    description: '',
    amount:      '',
    currency:    'INR',
    splitType:   'equal',
    expenseDate: new Date().toISOString().split('T')[0],
    paidBy:      user?.id || ''
  })

  const [participants, setParticipants] = useState(
    members.map(m => ({ userId: m.id, name: m.name, selected: true, value: '' }))
  )
  const [loading, setLoading] = useState(false)

  // When split type changes, reset participant values
  useEffect(() => {
    setParticipants(members.map(m => ({
      userId:   m.id,
      name:     m.name,
      selected: true,
      value:    ''
    })))
  }, [form.splitType])

  function toggleParticipant(userId) {
    setParticipants(prev =>
      prev.map(p => p.userId === userId ? { ...p, selected: !p.selected } : p)
    )
  }

  function setParticipantValue(userId, value) {
    setParticipants(prev =>
      prev.map(p => p.userId === userId ? { ...p, value } : p)
    )
  }

  function getPreviewSplits() {
    const total   = parseFloat(form.amount) || 0
    const active  = participants.filter(p => p.selected)
    if (active.length === 0 || total === 0) return []

    if (form.splitType === 'equal') {
      const share = (total / active.length).toFixed(2)
      return active.map(p => ({ ...p, computed: share }))
    }

    if (form.splitType === 'percentage') {
      return active.map(p => ({
        ...p,
        computed: ((total * parseFloat(p.value || 0)) / 100).toFixed(2)
      }))
    }

    if (form.splitType === 'unequal') {
      return active.map(p => ({ ...p, computed: parseFloat(p.value || 0).toFixed(2) }))
    }

    if (form.splitType === 'share') {
      const totalUnits = active.reduce((s, p) => s + parseFloat(p.value || 1), 0)
      return active.map(p => ({
        ...p,
        computed: (total * parseFloat(p.value || 1) / totalUnits).toFixed(2)
      }))
    }

    return []
  }

  function validateSplits() {
    const total  = parseFloat(form.amount) || 0
    const active = participants.filter(p => p.selected)

    if (form.splitType === 'percentage') {
      const sum = active.reduce((s, p) => s + parseFloat(p.value || 0), 0)
      if (Math.abs(sum - 100) > 0.01) {
        toast.error(`Percentages sum to ${sum.toFixed(1)}%, must be 100%`)
        return false
      }
    }

    if (form.splitType === 'unequal') {
      const sum = active.reduce((s, p) => s + parseFloat(p.value || 0), 0)
      if (Math.abs(sum - total) > 0.02) {
        toast.error(`Shares sum to ₹${sum.toFixed(2)}, must equal ₹${total.toFixed(2)}`)
        return false
      }
    }

    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateSplits()) return

    const active = participants.filter(p => p.selected)
    const payload = {
      ...form,
      participants: active.map(p => ({
        userId:  p.userId,
        percent: form.splitType === 'percentage' ? parseFloat(p.value || 0) : undefined,
        share:   form.splitType === 'unequal'    ? parseFloat(p.value || 0) : undefined,
        units:   form.splitType === 'share'      ? parseFloat(p.value || 1) : undefined
      }))
    }

    setLoading(true)
    try {
      const res = await api.post(`/expenses/${groupId}`, payload)
      onAdded(res.data.expense)
      toast.success('Expense added')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add expense')
    } finally {
      setLoading(false)
    }
  }

  const previews = getPreviewSplits()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Add expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Dinner, Rent, Groceries"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              required
            />
          </div>

          {/* Amount + Currency */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                required
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {['INR','USD','EUR','GBP'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Paid by */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={form.expenseDate}
                onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Paid by</label>
              <select
                value={form.paidBy}
                onChange={e => setForm({ ...form, paidBy: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Split type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Split type</label>
            <div className="flex gap-2">
              {[
                { value: 'equal',      label: 'Equal' },
                { value: 'percentage', label: 'Percent' },
                { value: 'unequal',    label: 'Exact' },
                { value: 'share',      label: 'Shares' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, splitType: opt.value })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.splitType === opt.value
                      ? 'bg-teal-500 text-white border-teal-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Split with
              {form.splitType === 'percentage' && (
                <span className={`ml-2 ${
                  Math.abs(participants.filter(p=>p.selected).reduce((s,p) => s + parseFloat(p.value||0), 0) - 100) < 0.01
                    ? 'text-green-500'
                    : 'text-red-400'
                }`}>
                  ({participants.filter(p=>p.selected).reduce((s,p) => s + parseFloat(p.value||0), 0).toFixed(1)}% of 100%)
                </span>
              )}
            </label>

            <div className="space-y-2">
              {participants.map(p => (
                <div key={p.userId} className="flex items-center gap-3">
                  {/* Toggle checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleParticipant(p.userId)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      p.selected
                        ? 'bg-teal-500 border-teal-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {p.selected && <span className="text-white text-xs">✓</span>}
                  </button>

                  {/* Name */}
                  <span className={`text-sm flex-1 ${p.selected ? 'text-gray-700' : 'text-gray-400'}`}>
                    {p.name} {p.userId === user?.id ? '(you)' : ''}
                  </span>

                  {/* Value input for non-equal splits */}
                  {form.splitType !== 'equal' && p.selected && (
                    <div className="flex items-center gap-1">
                      {form.splitType === 'percentage' && <span className="text-xs text-gray-400">%</span>}
                      {form.splitType === 'unequal'    && <span className="text-xs text-gray-400">₹</span>}
                      {form.splitType === 'share'      && <span className="text-xs text-gray-400">×</span>}
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={p.value}
                        onChange={e => setParticipantValue(p.userId, e.target.value)}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400"
                        placeholder="0"
                      />
                    </div>
                  )}

                  {/* Preview computed share */}
                  {previews.find(pr => pr.userId === p.userId) && (
                    <span className="text-xs text-gray-400 w-16 text-right">
                      ₹{previews.find(pr => pr.userId === p.userId)?.computed}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}