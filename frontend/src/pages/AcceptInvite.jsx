import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function AcceptInvite() {
  const { token } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Load invite details on mount
  useEffect(() => {
    api.get(`/invites/accept/${token}`)
      .then(res => setInvite(res.data.invite))
      .catch(err => setError(err.response?.data?.error || 'Invalid invite link'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleAccept() {
    if (!user) {
      localStorage.setItem('pendingInviteToken', token)
      navigate(`/login?next=/invite/${token}`)
      return
    }

    setJoining(true)
    try {
      await api.post(`/invites/accept/${token}`)
      setDone(true)
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join group')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400 to-blue-500 animate-ping opacity-75"></div>
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-2xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="h-5 w-40 bg-gray-200 rounded-full mx-auto mb-3 animate-pulse"></div>
          <p className="text-gray-500 text-sm font-medium">Loading your invite...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      {/* Animated background dots */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative glass-card rounded-[2rem] shadow-[0_40px_120px_rgba(15,23,42,0.35)] border border-white/10 w-full max-w-md p-6 sm:p-8 transition-all duration-500 transform hover:scale-[1.01] text-center">
        {/* Error state */}
        {error && (
          <>
            <div className="w-20 h-20 bg-slate-900/80 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner ring-1 ring-white/10">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Invite unavailable</h2>
            <p className="text-sm text-red-600 mb-6">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-5 py-2.5 rounded-xl transition-all shadow-md"
            >
              Go to Dashboard
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </>
        )}

        {/* Success state */}
        {done && (
          <>
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl animate-bounce">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              You've joined {invite?.groupName}!
            </h2>
            <p className="text-sm text-slate-400 mb-4">Redirecting you to the group...</p>
            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin"></div>
          </>
        )}

        {/* Invite details */}
        {invite && !error && !done && (
          <>
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-blue-500 rounded-2xl blur-xl opacity-60 animate-pulse"></div>
              <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-500 text-white flex items-center justify-center text-4xl font-bold shadow-2xl">
                {invite.groupName?.charAt(0).toUpperCase()}
              </div>
            </div>

            <h2 className="text-2xl font-extrabold gradient-text mb-1">
              Join {invite.groupName}
            </h2>
            <p className="text-sm text-slate-400 mb-1">
              <span className="font-semibold text-gray-800">{invite.inviterName}</span> invited you to join
            </p>
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500 bg-gray-100 w-fit mx-auto px-3 py-1 rounded-full mb-6">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Expires {new Date(invite.expiresAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}</span>
            </div>

            {/* Not logged in warning */}
            {!user && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 mb-6 text-left shadow-sm">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-800">Sign in required</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      You need to be signed in to accept this invite. If you don't have an account, register first — use the email address this invite was sent to.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Wrong account warning */}
            {user && user.email.toLowerCase() !== invite.email.toLowerCase() && (
              <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 mb-6 text-left shadow-sm">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-800">Account mismatch</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      This invite was sent to <strong>{invite.email}</strong>. You're signed in as <strong>{user.email}</strong>. Please sign in with the correct account.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={joining || (user && user.email.toLowerCase() !== invite.email.toLowerCase())}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white py-3.5 rounded-xl font-extrabold text-base transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {joining ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Joining...
                </>
              ) : user ? (
                `Accept and join ${invite.groupName}`
              ) : (
                'Sign in to accept'
              )}
            </button>

            {!user && (
              <p className="mt-4 text-xs text-gray-500">
                No account?{' '}
                <Link
                  to={`/register?next=/invite/${token}`}
                  className="text-teal-600 hover:text-teal-700 font-semibold"
                >
                  Create one now
                </Link>
              </p>
            )}

            {user && user.email.toLowerCase() === invite.email.toLowerCase() && (
              <p className="mt-4 text-xs text-gray-400 bg-gray-50 p-2 rounded-lg">
                ✨ Once accepted, you'll be added as a member of this group.
              </p>
            )}
          </>
        )}
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  )
}