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
    <div className="w-64 sm:w-72 glass-card border-r border-white/10 flex flex-col h-full shadow-[0_35px_90px_rgba(15,23,42,0.45)]">
      {/* App header with gradient icon - premium */}
      <div className="px-4 py-5 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 via-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
            SplitApp
          </h1>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/80 rounded-3xl p-3 shadow-inner border border-white/10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white/10">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-100 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate hidden sm:block">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Groups list with custom scroll - colorful group items */}
      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <div className="px-4 mb-3 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 flex items-center justify-center">
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
                  w-full text-left px-3 py-2.5 rounded-3xl flex items-center gap-3 transition-all duration-200 group
                  ${isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 via-slate-900/50 to-emerald-500/15 shadow-[0_20px_50px_rgba(8,145,178,0.14)] border border-cyan-400/10 scale-[1.01]'
                    : 'hover:bg-slate-900/80 text-slate-100'}
                `}
              >
                <div className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-200
                  ${isActive
                    ? 'bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-200 group-hover:bg-gradient-to-br group-hover:from-cyan-500 group-hover:to-emerald-500 group-hover:text-white'}
                `}>
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${isActive ? 'text-cyan-200' : 'text-slate-100'}`}>
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
      <div className="border-t border-white/10 p-4 space-y-3 bg-slate-950/80 backdrop-blur-xl">
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
            className="btn-primary"
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