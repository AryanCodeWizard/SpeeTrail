import { useState, useEffect } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function MemberPanel({ group, onGroupUpdated }) {
  const { user }    = useAuth()
  const [email,     setEmail]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [pendingInvites, setPendingInvites] = useState([])
  const [cancelling, setCancelling] = useState(null)

  const isAdmin = group.memberships?.find(
    m => m.userId === user?.id && m.role === 'admin' && !m.leftAt
  )

  const activeMembers = group.memberships?.filter(m => !m.leftAt) || []
  const pastMembers   = group.memberships?.filter(m => m.leftAt)  || []

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
    <div className="space-y-6">

      {/* Active members */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Active members ({activeMembers.length})
        </h3>
        <div className="space-y-2">
          {activeMembers.map(m => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold">
                  {m.user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {m.user?.name}
                    {m.userId === user?.id && (
                      <span className="ml-1 text-xs text-gray-400">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">{m.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  m.role === 'admin'
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {m.role}
                </span>
                {isAdmin && m.userId !== user?.id && (
                  <button
                    onClick={() => removeMember(m.userId, m.user?.name)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite by email — admin only */}
      {isAdmin && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">
            Invite member
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            They'll receive an email with a link to join.
            They need to register first if they don't have an account.
          </p>
          <form onSubmit={sendInvite} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-600 disabled:opacity-50 whitespace-nowrap"
            >
              {sending ? 'Sending...' : 'Send invite'}
            </button>
          </form>

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Pending invites ({pendingInvites.length})
              </h4>
              <div className="space-y-2">
                {pendingInvites.map(invite => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div>
                      <p className="text-sm text-gray-700">{invite.email}</p>
                      <p className="text-xs text-gray-400">
                        Expires {new Date(invite.expiresAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <button
                      onClick={() => cancelInvite(invite.id, invite.email)}
                      disabled={cancelling === invite.id}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                    >
                      {cancelling === invite.id ? '...' : 'Cancel'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past members */}
      {pastMembers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Past members
          </h3>
          <div className="space-y-2">
            {pastMembers.map(m => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg opacity-60"
              >
                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-semibold">
                  {m.user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-gray-600">{m.user?.name}</p>
                  <p className="text-xs text-gray-400">
                    Left {new Date(m.leftAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}