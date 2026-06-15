import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import ExpenseFeed from '../components/ExpenseFeed'
import BalancePanel from '../components/BalancePanel'
import MemberPanel from '../components/MemberPanel'
import AddExpenseModal from '../components/AddExpenseModal'
import ImportWizard from '../components/ImportWizard'

const TABS = ['Expenses', 'Balances', 'Members', 'Import']

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [groups, setGroups] = useState([])
  const [activeGroupId, setActiveGroupId] = useState(null)
  const [activeGroup, setActiveGroup] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [balanceData, setBalanceData] = useState(null)
  const [activeTab, setActiveTab] = useState('Expenses')
  const [showAddModal, setShowAddModal] = useState(false)
  const [loadingGroup, setLoadingGroup] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
    setIsSidebarOpen(false)
  }

  function handleGroupUpdated() {
    loadGroupData(activeGroupId)
  }

  function handleExpenseAdded(expense) {
    setExpenses(prev => [expense, ...prev])
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
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
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

  // Close sidebar on window resize to desktop view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 -left-20 w-72 h-72 rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.28),_transparent_55%)] blur-3xl"></div>
        <div className="absolute -bottom-24 right-0 w-96 h-96 rounded-full bg-[radial-gradient(circle,_rgba(6,182,212,0.22),_transparent_50%)] blur-3xl"></div>
        <div className="absolute left-1/2 top-10 w-72 h-72 rounded-full bg-[radial-gradient(circle,_rgba(16,185,129,0.18),_transparent_50%)] blur-3xl -translate-x-1/2"></div>
      </div>
      <Toaster position="top-right" toastOptions={{ className: 'text-sm' }} />

      {/* Mobile menu backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - responsive with animation */}
      <div className={`
        fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          groups={groups}
          activeGroupId={activeGroupId}
          onSelectGroup={id => {
            setActiveGroupId(id)
            setActiveTab('Expenses')
            setIsSidebarOpen(false)
          }}
          onGroupCreated={handleGroupCreated}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Mobile header with gradient background */}
        <div className="lg:hidden bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl bg-slate-900/90 text-slate-200 hover:bg-slate-800 transition-all duration-200 shadow-sm"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5 text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1">
            <h2 className="font-extrabold text-slate-100">{activeGroup?.name || 'Shared Expenses'}</h2>
            {activeGroup && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {activeMembers.length} member{activeMembers.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {activeGroupId && activeTab === 'Expenses' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-cyan-400 via-sky-500 to-emerald-400 text-slate-950 p-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
              aria-label="Add expense"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {/* No group selected - elegant empty state */}
        {!activeGroupId && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm glass-card p-8 shadow-[0_40px_80px_rgba(15,23,42,0.35)] border border-white/10">
              <div className="w-24 h-24 mx-auto mb-5 bg-slate-900/80 rounded-full flex items-center justify-center shadow-inner ring-1 ring-white/10">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium text-sm">Select or create a group to get started</p>
              <p className="text-gray-400 text-xs mt-2">Click the menu icon to create your first group</p>
            </div>
          </div>
        )}

        {activeGroupId && (
          <>
            {/* Desktop top bar - premium design */}
            <div className="hidden lg:flex glass-card border-b border-white/10 px-6 py-4 items-center justify-between flex-shrink-0 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"></div>
                  <h1 className="text-2xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent tracking-tight">
                    {activeGroup?.name || '...'}
                  </h1>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium text-gray-600 bg-gray-100/80 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {activeTab === 'Expenses' && expenses.length > 0 && (
                  <button
                    onClick={handleExport}
                    className="group px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
                  >
                    <svg className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                  </button>
                )}
                {activeTab === 'Expenses' && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Add expense
                  </button>
                )}
              </div>
            </div>

            {/* Tabs - modern gradient active indicator */}
            <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 flex-shrink-0 sticky top-0 z-10">
              <div className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
                {TABS.map(tab => {
                  const isActive = activeTab === tab
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`
                        relative px-4 sm:px-5 py-3 text-sm font-bold transition-all duration-200 whitespace-nowrap
                        ${isActive 
                          ? 'text-indigo-700' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 rounded-t-lg'
                        }
                      `}
                    >
                      {tab}
                      {tab === 'Expenses' && expenses.length > 0 && (
                        <span className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {expenses.length}
                        </span>
                      )}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tab content with fade animation */}
            <div className="flex-1 overflow-y-auto">
              {loadingGroup ? (
                <div className="p-8">
                  <div className="animate-pulse space-y-5">
                    <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-full"></div>
                    <div className="space-y-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-28 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg"></div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-in fade-in duration-300">
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

      <style>{`
        @keyframes fade-in {
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
          animation: fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}