import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Sidebar({ groups, activeGroupId, onSelectGroup, onGroupCreated }) {
  const { user, logout } = useAuth()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')
  const [loading, setLoading]   = useState(false)

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
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">

      {/* App header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-teal-600">SplitApp</h1>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email}</p>
      </div>

      {/* Groups list */}
      <div className="flex-1 overflow-y-auto py-2">
        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Groups
        </p>

        {groups.length === 0 && (
          <p className="px-4 text-sm text-gray-400">No groups yet</p>
        )}

        {groups.map(group => {
          const isActive    = group.id === activeGroupId
          const memberCount = group.memberships?.filter(m => !m.leftAt).length || 0

          return (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                isActive ? 'bg-teal-50 border-r-2 border-teal-500' : ''
              }`}
            >
              {/* Group avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                isActive ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {group.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${
                  isActive ? 'text-teal-700' : 'text-gray-700'
                }`}>
                  {group.name}
                </p>
                <p className="text-xs text-gray-400">
                  {memberCount} member{memberCount !== 1 ? 's' : ''}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Create group */}
      <div className="border-t border-gray-100 p-3">
        {creating ? (
          <form onSubmit={handleCreate} className="space-y-2">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Group name"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-teal-500 text-white py-1.5 rounded text-xs font-medium hover:bg-teal-600 disabled:opacity-50"
              >
                {loading ? '...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setNewName('') }}
                className="flex-1 border border-gray-300 text-gray-600 py-1.5 rounded text-xs hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full text-sm text-teal-600 hover:text-teal-700 font-medium py-1.5 flex items-center gap-1"
          >
            <span className="text-lg leading-none">+</span> New group
          </button>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full text-xs text-gray-400 hover:text-red-500 mt-2 py-1 text-left transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}