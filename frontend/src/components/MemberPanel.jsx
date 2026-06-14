import { useState, useEffect } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function MemberPanel({ group, onGroupUpdated }) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingInvites, setPendingInvites] = useState([])
  const [cancelling, setCancelling] = useState(null)

  const isAdmin = group.memberships?.find(
    m => m.userId === user?.id && m.role === 'admin' && !m.leftAt
  )

  const activeMembers = group.memberships?.filter(m => !m.leftAt) || []
  const pastMembers = group.memberships?.filter(m => m.leftAt) || []

  useEffect(() => {
    if (isAdmin) fetchPendingInvites()
  }, [group.id, isAdmin])

  async function fetchPendingInvites() {
    try {
      const res = await api.get(`/invites/${group.id}/pending`)
      setPendingInvites(res.data.invites)
    } catch { /* non-critical */ }
  }

  async function sendInvite(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    try {
      await api.post(`/invites/${group.id}`, { email: email.trim() })
      toast.success(`Invite sent to ${email}`)
      setEmail('')
      fetchPendingInvites()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send invite')
    } finally {
      setSending(false)
    }
  }

  async function cancelInvite(inviteId, email) {
    setCancelling(inviteId)
    try {
      await api.delete(`/invites/${group.id}/${inviteId}`)
      toast.success(`Invite to ${email} cancelled`)
      fetchPendingInvites()
    } catch (err) {
      toast.error('Failed to cancel invite')
    } finally {
      setCancelling(null)
    }
  }

  async function removeMember(userId, name) {
    if (!window.confirm(`Remove ${name}? Their expenses will remain.`)) return
    try {
      await api.delete(`/groups/${group.id}/members/${userId}`)
      toast.success(`${name} removed`)
      onGroupUpdated()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member')
    }
  }

  return (
    <div className="space-y-8">
      {/* Active members section - colorful gradient header */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-800 tracking-wide">Active members</h3>
          <span className="bg-gradient-to-r from-teal-100 to-emerald-100 text-teal-700 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-inner">
            {activeMembers.length}
          </span>
        </div>
        <div className="space-y-3">
          {activeMembers.map(m => (
            <div
              key={m.id}
              className="group flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white flex items-center justify-center text-base font-bold shadow-md">
                    {m.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  {m.userId === user?.id && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    {m.user?.name}
                    {m.userId === user?.id && (
                      <span className="ml-1.5 text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">you</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {m.user?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-sm ${
                  m.role === 'admin'
                    ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {m.role === 'admin' ? '👑 Admin' : 'Member'}
                </span>
                {isAdmin && m.userId !== user?.id && (
                  <button
                    onClick={() => removeMember(m.userId, m.user?.name)}
                    className="text-xs text-red-500 hover:text-white transition-all duration-200 hover:bg-red-500 px-2 py-1 rounded-lg border border-red-200 hover:border-red-500"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          {activeMembers.length === 0 && (
            <div className="text-center py-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-inner">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-gray-500">No active members yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Invite section - admin only with gradient card */}
      {isAdmin && (
        <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 rounded-xl p-5 border border-indigo-100 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-800 tracking-wide">Invite new member</h3>
          </div>
          <p className="text-xs text-gray-600 mb-4 bg-white/50 p-2 rounded-lg">
            They'll receive an email with a link to join. They need to register first if they don't have an account.
          </p>
          <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all bg-white shadow-sm"
            />
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </>
              ) : (
                '📧 Send invite'
              )}
            </button>
          </form>

          {/* Pending invites - colorful warning style */}
          {pendingInvites.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Pending invites ({pendingInvites.length})
                </h4>
              </div>
              <div className="space-y-2">
                {pendingInvites.map(invite => (
                  <div
                    key={invite.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                        <span>✉️</span> {invite.email}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-amber-700 mt-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Expires {new Date(invite.expiresAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => cancelInvite(invite.id, invite.email)}
                      disabled={cancelling === invite.id}
                      className="text-xs text-red-600 hover:text-white font-semibold transition-all hover:bg-red-500 px-2 py-1 rounded-lg border border-red-200 hover:border-red-500"
                    >
                      {cancelling === invite.id ? (
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        'Cancel'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past members section - muted but elegant */}
      {pastMembers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center shadow-sm">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Past members</h3>
            <span className="bg-gray-200 text-gray-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{pastMembers.length}</span>
          </div>
          <div className="space-y-2">
            {pastMembers.map(m => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 bg-gray-50/70 rounded-xl border border-gray-100 opacity-70 hover:opacity-100 transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-bold shadow-inner">
                  {m.user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{m.user?.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    <span>Left {new Date(m.leftAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}