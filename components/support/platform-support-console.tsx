'use client'

// ==============================================================================
// InkFlow SaaS - Platform Support Console Master Workspace
// Unified 3-Pane Console: Triage Queue, Realtime Chat, and Tenant Context Inspector.
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react'
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Inbox,
  UserCheck,
  Zap,
  Activity,
  Timer,
  Building2,
  ChevronRight,
  Sparkles,
  X,
  SlidersHorizontal,
} from 'lucide-react'
import {
  SupportConversationRecord,
  SupportOverviewStats,
  SupportStatus,
  SupportPriority,
  SupportCategory,
  SUPPORT_STATUS_CONFIG,
  SUPPORT_PRIORITY_CONFIG,
  SUPPORT_CATEGORIES,
} from '@/types/support.types'
import { PlatformChatPane } from './platform-chat-pane'
import { PlatformTicketInfo } from './platform-ticket-info'
import { useSupportChat } from '@/hooks/use-support-chat'
import { getPlatformSupportStatsAction } from '@/actions/support.actions'
import { formatDate, formatTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface PlatformSupportConsoleProps {
  currentAdminId?: string
  currentAdminName?: string
  onOpenImpersonationModal?: (companyId: string, companyName: string) => void
}

export function PlatformSupportConsole({
  currentAdminId,
  currentAdminName,
  onOpenImpersonationModal,
}: PlatformSupportConsoleProps) {
  const [activeQueueTab, setActiveQueueTab] = useState<
    'all' | 'unassigned' | 'mine' | 'open' | 'waiting_customer' | 'urgent' | 'resolved'
  >('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState<SupportOverviewStats | null>(null)
  const [showDetailsPane, setShowDetailsPane] = useState(true)

  const {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    selectedConversation,
    messages,
    loading,
    loadingMessages,
    loadConversations,
    sendMessage,
    updateStatus,
    updatePriority,
    updateCategory,
    assignTicket,
  } = useSupportChat({
    mode: 'platform',
  })

  // Load stats
  const refreshStats = async () => {
    try {
      const s = await getPlatformSupportStatsAction()
      setStats(s)
    } catch {}
  }

  useEffect(() => {
    refreshStats()
  }, [conversations])

  // Filter queue list
  const filteredQueue = useMemo(() => {
    return conversations.filter((c) => {
      // Tab filter
      if (activeQueueTab === 'unassigned' && c.assigned_to) return false
      if (activeQueueTab === 'mine' && c.assigned_to !== currentAdminId) return false
      if (activeQueueTab === 'open' && c.status !== 'open') return false
      if (activeQueueTab === 'waiting_customer' && c.status !== 'waiting_customer') return false
      if (activeQueueTab === 'urgent' && c.priority !== 'urgent') return false
      if (activeQueueTab === 'resolved' && c.status !== 'resolved' && c.status !== 'closed') return false

      // Dropdown filters
      if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTicket = c.ticket_number.toLowerCase().includes(q)
        const matchSubject = c.subject.toLowerCase().includes(q)
        const matchCompany = c.company_name?.toLowerCase().includes(q)
        const matchUser = c.created_by_name?.toLowerCase().includes(q)
        const matchEmail = c.created_by_email?.toLowerCase().includes(q)
        const matchPreview = c.last_message_preview?.toLowerCase().includes(q)
        if (!matchTicket && !matchSubject && !matchCompany && !matchUser && !matchEmail && !matchPreview) {
          return false
        }
      }

      return true
    })
  }, [conversations, activeQueueTab, priorityFilter, categoryFilter, searchQuery, currentAdminId])

  const resetFilters = () => {
    setActiveQueueTab('all')
    setPriorityFilter('all')
    setCategoryFilter('all')
    setSearchQuery('')
  }

  return (
    <div className="flex flex-col h-full space-y-3 font-sans overflow-hidden">
      {/* 1. Metric Overview Header Cards (Clickable Quick Filters) */}
      <div
        className={cn(
          'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0 transition-all',
          selectedConversationId && 'hidden lg:grid'
        )}
      >
        {/* Total Tickets */}
        <button
          type="button"
          onClick={() => {
            setActiveQueueTab('all')
            setPriorityFilter('all')
          }}
          className={cn(
            'p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between',
            activeQueueTab === 'all' && priorityFilter === 'all'
              ? 'bg-slate-800/90 border-indigo-500/80 shadow-md shadow-indigo-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          )}
        >
          <div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Total Tickets
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-100 mt-0.5">{stats?.totalCount || 0}</div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
            <Inbox className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Open / Unassigned */}
        <button
          type="button"
          onClick={() => {
            setActiveQueueTab('unassigned')
            setPriorityFilter('all')
          }}
          className={cn(
            'p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between',
            activeQueueTab === 'unassigned'
              ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md shadow-emerald-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:border-emerald-800/60'
          )}
        >
          <div>
            <div className="text-[10px] sm:text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
              Unassigned
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">{stats?.unassignedCount || 0}</div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Assigned to Me */}
        <button
          type="button"
          onClick={() => {
            setActiveQueueTab('mine')
            setPriorityFilter('all')
          }}
          className={cn(
            'p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between',
            activeQueueTab === 'mine'
              ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:border-indigo-800/60'
          )}
        >
          <div>
            <div className="text-[10px] sm:text-[11px] text-indigo-400 font-semibold uppercase tracking-wider">
              My Tickets
            </div>
            <div className="text-lg sm:text-xl font-black text-indigo-400 mt-0.5">{stats?.assignedToMeCount || 0}</div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-indigo-950/70 border border-indigo-800 text-indigo-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Waiting Customer */}
        <button
          type="button"
          onClick={() => {
            setActiveQueueTab('waiting_customer')
            setPriorityFilter('all')
          }}
          className={cn(
            'p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between',
            activeQueueTab === 'waiting_customer'
              ? 'bg-amber-950/40 border-amber-500/80 shadow-md shadow-amber-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:border-amber-800/60'
          )}
        >
          <div>
            <div className="text-[10px] sm:text-[11px] text-amber-400 font-semibold uppercase tracking-wider">
              Waiting
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-400 mt-0.5">{stats?.waitingCustomerCount || 0}</div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-amber-950/70 border border-amber-800 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Urgent Priority */}
        <button
          type="button"
          onClick={() => {
            setActiveQueueTab('urgent')
            setPriorityFilter('all')
          }}
          className={cn(
            'p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between',
            activeQueueTab === 'urgent'
              ? 'bg-rose-950/40 border-rose-500/80 shadow-md shadow-rose-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:border-rose-800/60'
          )}
        >
          <div>
            <div className="text-[10px] sm:text-[11px] text-rose-400 font-semibold uppercase tracking-wider">
              Urgent SLA
            </div>
            <div className="text-lg sm:text-xl font-black text-rose-400 mt-0.5">{stats?.urgentCount || 0}</div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-400 flex items-center justify-center shrink-0">
            <Zap className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Avg First Response */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-[11px] text-purple-400 font-semibold uppercase tracking-wider">
              Avg SLA
            </div>
            <div className="text-lg sm:text-xl font-black text-purple-400 mt-0.5">
              {stats?.averageFirstResponseMinutes || 15}m
            </div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-purple-950/70 border border-purple-800 text-purple-400 flex items-center justify-center shrink-0">
            <Timer className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* 2. Main 3-Pane Workstation Container */}
      <div className="flex-1 min-h-0 bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden flex shadow-2xl relative">
        {/* Left Pane: Conversation Queue */}
        <div
          className={cn(
            'w-full lg:w-80 shrink-0 h-full flex flex-col border-r border-slate-800 bg-slate-900/90 min-w-0',
            selectedConversationId && 'hidden lg:flex'
          )}
        >
          {/* Queue Filter Bar */}
          <div className="p-3 border-b border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Triage Queue ({filteredQueue.length})
                </h3>
              </div>
              <button
                onClick={() => {
                  loadConversations()
                  refreshStats()
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Refresh Queue"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search ticket, company, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Queue Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs scrollbar-none">
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'unassigned', label: 'Unassigned' },
                  { key: 'mine', label: 'Mine' },
                  { key: 'open', label: 'Open' },
                  { key: 'urgent', label: 'Urgent' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveQueueTab(tab.key)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer',
                    activeQueueTab === tab.key
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-800">
            {loading && conversations.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="p-3 rounded-xl bg-slate-950/40 animate-pulse space-y-2">
                    <div className="h-3 bg-slate-800 rounded w-1/3" />
                    <div className="h-3 bg-slate-800 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <p>No tickets matching current filters.</p>
                <button
                  onClick={resetFilters}
                  className="px-3 py-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 bg-slate-950 border border-slate-800 rounded-lg"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredQueue.map((conv) => {
                const statusConfig = SUPPORT_STATUS_CONFIG[conv.status]
                const priorityConfig = SUPPORT_PRIORITY_CONFIG[conv.priority]
                const isSelected = selectedConversationId === conv.id

                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversationId(conv.id)
                      setShowDetailsPane(true)
                    }}
                    className={cn(
                      'w-full text-left p-3.5 transition-all flex flex-col gap-1.5 cursor-pointer relative',
                      isSelected
                        ? 'bg-slate-800/95 border-l-4 border-indigo-500 text-white shadow-inner'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-indigo-400">{conv.ticket_number}</span>
                      <div className="flex items-center gap-1">
                        {conv.priority === 'urgent' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            URGENT
                          </span>
                        )}
                        <span className={cn('px-1.5 py-0.2 rounded text-[10px] border font-medium', statusConfig.badgeClass)}>
                          {statusConfig.labelEn}
                        </span>
                      </div>
                    </div>

                    <div className="font-bold text-xs text-slate-100 truncate">{conv.subject}</div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate max-w-[140px] text-slate-300 font-medium">
                        {conv.company_name || 'Tenant'}
                      </span>
                      <span>{formatTime(conv.last_message_at)}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Center Pane: Active Live Chat */}
        <div className={cn('flex-1 min-w-0 h-full flex flex-col', !selectedConversationId && 'hidden lg:flex')}>
          <PlatformChatPane
            conversation={selectedConversation}
            messages={messages}
            loading={loadingMessages}
            onSendMessage={sendMessage}
            onUpdateStatus={updateStatus}
            onUpdatePriority={updatePriority}
            onUpdateCategory={updateCategory}
            onAssignTicket={assignTicket}
            onBackToQueue={() => setSelectedConversationId(null)}
            onToggleDetails={() => setShowDetailsPane((prev) => !prev)}
            showDetails={showDetailsPane}
            currentAdminId={currentAdminId}
            currentAdminName={currentAdminName}
          />
        </div>

        {/* Right Pane: Context & Tenant Info (Desktop xl view) */}
        {selectedConversation && showDetailsPane && (
          <div className="hidden xl:block h-full">
            <PlatformTicketInfo
              conversation={selectedConversation}
              onOpenImpersonationModal={onOpenImpersonationModal}
              onClose={() => setShowDetailsPane(false)}
            />
          </div>
        )}

        {/* Slide-over Drawer for Tablet / Mobile (< xl) */}
        {selectedConversation && showDetailsPane && (
          <div className="xl:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex justify-end">
            <div className="h-full bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-200">
              <PlatformTicketInfo
                conversation={selectedConversation}
                onOpenImpersonationModal={(cId, cName) => {
                  setShowDetailsPane(false)
                  if (onOpenImpersonationModal) onOpenImpersonationModal(cId, cName)
                }}
                onClose={() => setShowDetailsPane(false)}
                isDrawer
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
