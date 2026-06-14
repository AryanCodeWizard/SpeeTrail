import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Sidebar         from '../components/Sidebar'
import ExpenseFeed     from '../components/ExpenseFeed'
import BalancePanel    from '../components/BalancePanel'
import MemberPanel     from '../components/MemberPanel'
import AddExpenseModal from '../components/AddExpenseModal'
import ImportWizard    from '../components/ImportWizard'

const TABS = ['Expenses', 'Balances', 'Members', 'Import']

export default function Home() {
  const { user }    = useAuth()
  const navigate    = useNavigate()

  const [groups,        setGroups]        = useState([])
  const [activeGroupId, setActiveGroupId] = useState(null)
  const [activeGroup,   setActiveGroup]   = useState(null)
  const [expenses,      setExpenses]      = useState([])
  const [balanceData,   setBalanceData]   = useState(null)
  const [activeTab,     setActiveTab]     = useState('Expenses')
  const [showAddModal,  setShowAddModal]  = useState(false)
  const [loadingGroup,  setLoadingGroup]  = useState(false)

  // Load user's groups on mount
  useEffect(() => {
    api.get('/groups').then(res => {
      setGroups(res.data.groups)
      if (res.data.groups.length > 0) {
        setActiveGroupId(res.data.groups[0].id)
      }
    })
  }, [])

  // Load group data when active group changes
  useEffect(() => {
    if (!activeGroupId) return
    loadGroupData(activeGroupId)
  }, [activeGroupId])

  async function loadGroupData(groupId) {
    setLoadingGroup(true)
    setExpenses([])
    setBalanceData(null)

    try {
      const [gRes, eRes, bRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/expenses/${groupId}`),
        api.get(`/balances/${groupId}`)
      ])
      setActiveGroup(gRes.data.group)
      setExpenses(eRes.data.expenses)
      setBalanceData(bRes.data)
    } catch (err) {
      console.error('Failed to load group data', err)
    } finally {
      setLoadingGroup(false)
    }
  }

  function handleGroupCreated(group) {
    setGroups(prev => [group, ...prev])
    setActiveGroupId(group.id)
  }

  function handleGroupUpdated() {
    loadGroupData(activeGroupId)
  }

  function handleExpenseAdded(expense) {
    setExpenses(prev => [expense, ...prev])
    // Refresh balances
    api.get(`/balances/${activeGroupId}`).then(res => setBalanceData(res.data))
  }

  function handleExpenseDeleted(expenseId) {
    setExpenses(prev => prev.filter(e => e.id !== expenseId))
    api.get(`/balances/${activeGroupId}`).then(res => setBalanceData(res.data))
  }

  function handleSettled() {
    api.get(`/balances/${activeGroupId}`).then(res => setBalanceData(res.data))
  }

  function handleImportComplete() {
    loadGroupData(activeGroupId)
    setActiveTab('Expenses')
  }

  // CSV export
  function handleExport() {
    if (!expenses.length) return

    const headers = [
      'Date', 'Description', 'Paid By', 'Amount (INR)',
      'Original Amount', 'Currency', 'Split Type', 'Participants'
    ]

    const rows = expenses.map(e => [
      new Date(e.expenseDate).toISOString().split('T')[0],
      e.description,
      e.payer?.name,
      parseFloat(e.amountInr).toFixed(2),
      parseFloat(e.amountOriginal).toFixed(2),
      e.currency,
      e.splitType,
      e.splits?.map(s => `${s.user?.name}:${parseFloat(s.shareAmount).toFixed(2)}`).join('; ')
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${activeGroup?.name || 'expenses'}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const activeMembers = activeGroup?.memberships
    ?.filter(m => !m.leftAt)
    .map(m => m.user) || []

  const isAdmin = activeGroup?.memberships?.find(
    m => m.userId === user?.id && m.role === 'admin' && !m.leftAt
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <Sidebar
        groups={groups}
        activeGroupId={activeGroupId}
        onSelectGroup={id => { setActiveGroupId(id); setActiveTab('Expenses') }}
        onGroupCreated={handleGroupCreated}
      />

      {/* Main content */}
      <div className="ml-64 flex-1 flex flex-col overflow-hidden">

        {/* No group selected */}
        {!activeGroupId && (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-3">👈</div>
              <p className="text-sm">Select or create a group to get started</p>
            </div>
          </div>
        )}

        {activeGroupId && (
          <>
            {/* Top bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-semibold text-gray-800">
                  {activeGroup?.name || '...'}
                </h2>
                <p className="text-xs text-gray-400">
                  {activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Add expense button */}
              {activeTab === 'Expenses' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors"
                >
                  + Add expense
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200 px-6 flex-shrink-0">
              <div className="flex gap-0">
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                    {tab === 'Expenses' && expenses.length > 0 && (
                      <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                        {expenses.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {loadingGroup ? (
                <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                  Loading...
                </div>
              ) : (
                <div className="max-w-2xl mx-auto px-6 py-6">

                  {activeTab === 'Expenses' && (
                    <ExpenseFeed
                      groupId={activeGroupId}
                      expenses={expenses}
                      isAdmin={!!isAdmin}
                      onDeleted={handleExpenseDeleted}
                      onExport={handleExport}
                    />
                  )}

                  {activeTab === 'Balances' && (
                    <BalancePanel
                      groupId={activeGroupId}
                      data={balanceData}
                      onSettled={handleSettled}
                    />
                  )}

                  {activeTab === 'Members' && activeGroup && (
                    <MemberPanel
                      group={activeGroup}
                      onGroupUpdated={handleGroupUpdated}
                    />
                  )}

                  {activeTab === 'Import' && (
                    <ImportWizard
                      groupId={activeGroupId}
                      onComplete={handleImportComplete}
                    />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add expense modal */}
      {showAddModal && activeGroupId && (
        <AddExpenseModal
          groupId={activeGroupId}
          members={activeMembers}
          onClose={() => setShowAddModal(false)}
          onAdded={handleExpenseAdded}
        />
      )}
    </div>
  )
}