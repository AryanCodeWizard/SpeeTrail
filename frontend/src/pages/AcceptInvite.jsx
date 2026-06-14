import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function AcceptInvite() {
  const { token }  = useParams()
  const { user }   = useAuth()
  const navigate   = useNavigate()

  const [invite,  setInvite]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  // Load invite details on mount
  useEffect(() => {
    api.get(`/invites/accept/${token}`)
      .then(res => setInvite(res.data.invite))
      .catch(err => setError(err.response?.data?.error || 'Invalid invite link'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleAccept() {
    if (!user) {
      // Save token to localStorage, redirect to login
      localStorage.setItem('pendingInviteToken', token)
      navigate(`/login?next=/invite/${token}`)
      return
    }

    setJoining(true)
    try {
      const res = await api.post(`/invites/accept/${token}`)
      setDone(true)
      // Redirect to the group after 2 seconds
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join group')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading invite...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-md p-8 text-center">

        {/* Error state */}
        {error && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="font-semibold text-gray-800 mb-2">Invite unavailable</h2>
            <p className="text-sm text-red-500 mb-6">{error}</p>
            <Link to="/" className="text-sm text-teal-600 hover:underline">
              Go to SplitApp →
            </Link>
          </>
        )}

        {/* Success state */}
        {done && (
          <>
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="font-semibold text-gray-800 mb-2">
              You've joined {invite?.groupName}!
            </h2>
            <p className="text-sm text-gray-400">Redirecting you now...</p>
          </>
        )}

        {/* Invite details */}
        {invite && !error && !done && (
          <>
            <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              {invite.groupName?.charAt(0).toUpperCase()}
            </div>

            <h2 className="font-semibold text-gray-800 mb-1">
              Join {invite.groupName}
            </h2>
            <p className="text-sm text-gray-500 mb-1">
              <span className="font-medium">{invite.inviterName}</span> invited you
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Expires {new Date(invite.expiresAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </p>

            {/* Not logged in warning */}
            {!user && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-left">
                <p className="text-xs text-amber-700">
                  You need to be signed in to accept this invite.
                  If you don't have an account, register first —
                  use the email address this invite was sent to.
                </p>
              </div>
            )}

            {/* Wrong account warning */}
            {user && user.email.toLowerCase() !== invite.email.toLowerCase() && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left">
                <p className="text-xs text-red-700">
                  This invite was sent to <strong>{invite.email}</strong>.
                  You're signed in as <strong>{user.email}</strong>.
                  Please sign in with the correct account.
                </p>
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={joining || (user && user.email.toLowerCase() !== invite.email.toLowerCase())}
              className="w-full bg-teal-500 text-white py-3 rounded-lg font-medium hover:bg-teal-600 disabled:opacity-50 transition-colors"
            >
              {joining
                ? 'Joining...'
                : user
                  ? `Accept and join ${invite.groupName}`
                  : 'Sign in to accept'}
            </button>

            {!user && (
              <p className="mt-3 text-xs text-gray-400">
                No account?{' '}
                <Link
                  to={`/register?next=/invite/${token}`}
                  className="text-teal-600 hover:underline"
                >
                  Register first
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}