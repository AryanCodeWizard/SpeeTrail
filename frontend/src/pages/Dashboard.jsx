import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import api from '../api/axios'

export default function Dashboard() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchGroups()
  }, [])

  async function fetchGroups() {
    try {
      const res = await api.get('/groups')
      setGroups(res.data.groups)
    } catch {
      setError('Failed to load groups')
    } finally {
      setLoading(false)
    }
  }

  async function createGroup(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await api.post('/groups', { name: newName.trim() })
      setGroups(prev => [res.data.group, ...prev])
      setNewName('')
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  // Loading state with shimmer effect
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-9 w-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-6"></div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-5 mb-6">
              <div className="flex gap-3">
                <div className="h-11 flex-1 bg-gray-200 rounded-xl"></div>
                <div className="h-11 w-28 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-5">
                  <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Header with gradient line */}
        <div className="mb-10 relative">
          <div className="absolute left-0 top-0 w-20 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mt-3 tracking-tight">
            Your groups
          </h1>
          <p className="text-gray-500 mt-2 text-sm flex items-center gap-1">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Manage and track shared expenses with friends
          </p>
        </div>

        {/* Error Alert - colorful */}
        {error && (
          <div
            className="mb-6 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-xl text-red-700 text-sm flex items-start gap-3 shadow-sm"
            role="alert"
            aria-live="assertive"
          >
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Create Group Form Card - premium gradient */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-5 sm:p-6 mb-10 transition-all hover:shadow-2xl">
          <form onSubmit={createGroup} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="groupName" className="sr-only">Group name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <input
                  id="groupName"
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g., Weekend trip, Rent, Groceries"
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white/80 hover:bg-white shadow-sm"
                  disabled={creating}
                  aria-label="New group name"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold rounded-xl shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {creating ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  New group
                </>
              )}
            </button>
          </form>
        </div>

        {/* Group List - modern animated cards */}
        {groups.length === 0 ? (
          <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-200 shadow-inner">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-5 shadow-md">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-gray-800 font-bold text-xl mb-1">No groups yet</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Create your first group above to start splitting expenses with friends, family, or colleagues.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group, idx) => (
              <div
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
                className="group bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-5 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:bg-white active:scale-[0.98]"
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/groups/${group.id}`)}
                aria-label={`Open group ${group.name}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"></div>
                      <h2 className="font-extrabold text-gray-800 text-lg tracking-tight">
                        {group.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 bg-gray-100/50 rounded-full px-2 py-0.5 w-fit">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>
                        {group.memberships?.length || 0} member{group.memberships?.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="text-indigo-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-indigo-600 bg-indigo-50/50 rounded-full p-2 group-hover:bg-indigo-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}