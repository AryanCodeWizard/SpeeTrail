import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Sidebar({ groups, activeGroupId, onSelectGroup, onGroupCreated }) {
  const { user, logout } = useAuth()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setLoading(true)
    try {
      const res = await api.post('/groups', { name: newName.trim() })
      onGroupCreated(res.data.group)
      setNewName('')
      setCreating(false)
      toast.success('Group created')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-64 sm:w-72 bg-white/90 backdrop-blur-sm border-r border-gray-100 flex flex-col h-full shadow-xl">
      {/* App header with gradient icon - premium */}
      <div className="px-4 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/30">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent tracking-tight">
            SplitApp
          </h1>
        </div>
        <div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-2 shadow-inner">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate hidden sm:block">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Groups list with custom scroll - colorful group items */}
      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <div className="px-4 mb-3 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your groups</p>
        </div>

        {groups.length === 0 && (
          <div className="px-4 py-8 text-center">
            <div className="text-4xl mb-3 opacity-60">👥</div>
            <p className="text-sm font-medium text-gray-500">No groups yet</p>
            <p className="text-xs text-gray-400 mt-1">Create one below to get started</p>
          </div>
        )}

        <div className="space-y-1 px-2">
          {groups.map(group => {
            const isActive = group.id === activeGroupId
            const memberCount = group.memberships?.filter(m => !m.leftAt).length || 0

            return (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={`
                  w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group
                  ${isActive
                    ? 'bg-gradient-to-r from-teal-50 to-emerald-50 shadow-md border border-teal-200 scale-[1.02]'
                    : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 text-gray-700'}
                `}
              >
                <div className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-200
                  ${isActive
                    ? 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md'
                    : 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700 group-hover:from-teal-400 group-hover:to-emerald-400 group-hover:text-white'}
                `}>
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${isActive ? 'text-teal-800' : 'text-gray-800'}`}>
                    {group.name}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 shadow-sm"></div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Create group & logout section - premium gradient buttons */}
      <div className="border-t border-gray-100 p-4 space-y-3 bg-gradient-to-r from-gray-50 to-white">
        {creating ? (
          <form onSubmit={handleCreate} className="space-y-3 animate-in slide-in-from-bottom-2 duration-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Group name"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all bg-white shadow-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {loading ? (
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  'Create group'
                )}
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setNewName('') }}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-xl text-xs font-semibold hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New group
          </button>
        )}

        {/* Logout button - subtle but visible */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 py-2 rounded-xl transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #94a3b8, #64748b);
        }
        @keyframes slide-in-from-bottom-2 {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-in {
          animation: slide-in-from-bottom-2 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  )
}