import { useEffect, useState } from 'react'

import Navbar from '../components/Navbar'
import api from '../api/axios'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const [groups,  setGroups]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { fetchGroups() }, [])

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
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">Your groups</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
        )}

        {/* Create group form */}
        <form onSubmit={createGroup} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New group name"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>

        {/* Group list */}
        {groups.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No groups yet. Create one above.
          </p>
        ) : (
          <div className="space-y-3">
            {groups.map(group => (
              <div
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
                className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-400 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{group.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {group.memberships?.length || 0} member
                      {group.memberships?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}