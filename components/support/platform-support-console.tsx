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

  return (
    <div className="flex flex-col h-full space-y-4 font-sans">
      {/* 1. Metric Overview Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Total Tickets</div>
            <div className="text-xl font-bold text-slate-100 mt-0.5">{stats?.totalCount || 0}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
            <Inbox className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-emerald-400 font-medium">Open / Unassigned</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{stats?.unassignedCount || 0}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-indigo-400 font-medium">Assigned to Me</div>
            <div className="text-xl font-bold text-indigo-400 mt-0.5">{stats?.assignedToMeCount || 0}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-950/60 border border-indigo-800/80 text-indigo-400 flex items-center justify-center">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-amber-400 font-medium">Waiting Customer</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">{stats?.waitingCustomerCount || 0}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-red-400 font-medium">Urgent Priority</div>
            <div className="text-xl font-bold text-red-400 mt-0.5">{stats?.urgentCount || 0}</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-red-950/60 border border-red-800/80 text-red-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-purple-400 font-medium">Avg First Response</div>
            <div className="text-xl font-bold text-purple-400 mt-0.5">
              {stats?.averageFirstResponseMinutes || 15}m
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-800/80 text-purple-400 flex items-center justify-center">
            <Timer className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2. Main 3-Pane Workstation Container */}
      <div className="flex-1 min-h-0 bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden flex shadow-xl">
        {/* Left Pane: Conversation Queue */}
        <div
          className={cn(
            'w-full lg:w-80 shrink-0 h-full flex flex-col border-r border-slate-800 bg-slate-900/90',
            selectedConversationId && 'hidden lg:flex'
          )}
        >
          {/* Queue Filter Bar */}
          <div className="p-3.5 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Triage Queue
                </h3>
              </div>
              <button
                onClick={() => {
                  loadConversations()
                  refreshStats()
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
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
            </div>

            {/* Queue Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
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
                    'px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors',
                    activeQueueTab === tab.key
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
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
              <div className="p-8 text-center text-slate-500 text-xs">
                No tickets matching current filters.
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
                      'w-full text-left p-3.5 transition-all flex flex-col gap-1 cursor-pointer relative',
                      isSelected
                        ? 'bg-slate-800/90 border-l-4 border-indigo-500 text-white'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-indigo-400">{conv.ticket_number}</span>
                      <span className={cn('px-1.5 py-0.2 rounded text-[10px] border font-medium', statusConfig.badgeClass)}>
                        {statusConfig.labelEn}
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-slate-100 truncate">{conv.subject}</div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                      <span className="truncate max-w-[150px]">{conv.company_name || 'Tenant'}</span>
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

        {/* Right Pane: Context & Tenant Info */}
        {selectedConversation && showDetailsPane && (
          <div className="hidden xl:block h-full">
            <PlatformTicketInfo
              conversation={selectedConversation}
              onOpenImpersonationModal={onOpenImpersonationModal}
              onClose={() => setShowDetailsPane(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
