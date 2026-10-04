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
 type="button"onClick={() => {
 setActiveQueueTab('all')
 setPriorityFilter('all')
          }}
 className={cn(
            'p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between',
 activeQueueTab === 'all' && priorityFilter === 'all'
              ? 'bg-card-elevated/90 border-primary/20/80 shadow-xs shadow-indigo-500/10'
              : 'bg-surface-inset border-border hover:border-border'
          )}
        >
          <div>
            <div className="text-xs sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">
 Total Tickets
            </div>
            <div className="text-lg sm:text-xl font-black text-foreground mt-0.5">{stats?.totalCount || 0}</div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-card-elevated text-muted-foreground flex items-center justify-center shrink-0">
            <Inbox className="w-3.5 h-3.5"/>
          </div>
        </button>

        {/* Open / Unassigned */}
        <button
 type="button"onClick={() => {
 setActiveQueueTab('unassigned')
 setPriorityFilter('all')
          }}
 className={cn(
            'p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between',
 activeQueueTab === 'unassigned'
              ? 'bg-success-surface border-success-border/80 shadow-xs shadow-emerald-500/10'
              : 'bg-surface-inset border-border hover:border-success-border/60'
          )}
        >
          <div>
            <div className="text-xs sm:text-xs text-success font-semibold uppercase tracking-wider">
 Unassigned
            </div>
            <div className="text-lg sm:text-xl font-black text-success mt-0.5">{stats?.unassignedCount || 0}</div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-success-surface/70 border border-success-border text-success flex items-center justify-center shrink-0">
            <AlertCircle className="w-3.5 h-3.5"/>
          </div>
        </button>

        {/* Assigned to Me */}
        <button
 type="button"onClick={() => {
 setActiveQueueTab('mine')
 setPriorityFilter('all')
          }}
 className={cn(
            'p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between',
 activeQueueTab === 'mine'
              ? 'bg-primary/10 border-primary/20/80 shadow-xs shadow-indigo-500/10'
              : 'bg-surface-inset border-border hover:border-border/60'
          )}
        >
          <div>
            <div className="text-xs sm:text-xs text-primary font-semibold uppercase tracking-wider">
 My Tickets
            </div>
            <div className="text-lg sm:text-xl font-black text-primary mt-0.5">{stats?.assignedToMeCount || 0}</div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-primary/10 border border-border text-primary flex items-center justify-center shrink-0">
            <UserCheck className="w-3.5 h-3.5"/>
          </div>
        </button>

        {/* Waiting Customer */}
        <button
 type="button"onClick={() => {
 setActiveQueueTab('waiting_customer')
 setPriorityFilter('all')
          }}
 className={cn(
            'p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between',
 activeQueueTab === 'waiting_customer'
              ? 'bg-warning-surface border-warning-border/80 shadow-xs shadow-amber-500/10'
              : 'bg-surface-inset border-border hover:border-warning-border/60'
          )}
        >
          <div>
            <div className="text-xs sm:text-xs text-warning font-semibold uppercase tracking-wider">
 Waiting
            </div>
            <div className="text-lg sm:text-xl font-black text-warning mt-0.5">{stats?.waitingCustomerCount || 0}</div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-warning-surface/70 border border-warning-border text-warning flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5"/>
          </div>
        </button>

        {/* Urgent Priority */}
        <button
 type="button"onClick={() => {
 setActiveQueueTab('urgent')
 setPriorityFilter('all')
          }}
 className={cn(
            'p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between',
 activeQueueTab === 'urgent'
              ? 'bg-danger-surface border-danger-border/80 shadow-xs shadow-rose-500/10'
              : 'bg-surface-inset border-border hover:border-danger-border/60'
          )}
        >
          <div>
            <div className="text-xs sm:text-xs text-destructive font-semibold uppercase tracking-wider">
 Urgent SLA
            </div>
            <div className="text-lg sm:text-xl font-black text-destructive mt-0.5">{stats?.urgentCount || 0}</div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-danger-surface/70 border border-danger-border text-destructive flex items-center justify-center shrink-0">
            <Zap className="w-3.5 h-3.5"/>
          </div>
        </button>

        {/* Avg First Response */}
        <div className="p-3 rounded-xl bg-surface-inset border border-border flex items-center justify-between">
          <div>
            <div className="text-xs sm:text-xs text-primary font-semibold uppercase tracking-wider">
 Avg SLA
            </div>
            <div className="text-lg sm:text-xl font-black text-primary mt-0.5">
              {stats?.averageFirstResponseMinutes || 15}m
            </div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-primary/10 border border-border text-primary flex items-center justify-center shrink-0">
            <Timer className="w-3.5 h-3.5"/>
          </div>
        </div>
      </div>

      {/* 2. Main 3-Pane Workstation Container */}
      <div className="flex-1 min-h-0 bg-surface-inset rounded-xl border border-border overflow-hidden flex shadow-xs relative">
        {/* Left Pane: Conversation Queue */}
        <div
 className={cn(
            'w-full lg:w-80 shrink-0 h-full flex flex-col border-r border-border bg-surface-inset min-w-0',
 selectedConversationId && 'hidden lg:flex'
          )}
        >
          {/* Queue Filter Bar */}
          <div className="p-3 border-b border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary"/>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
 Triage Queue ({filteredQueue.length})
                </h3>
              </div>
              <button
 onClick={() => {
 loadConversations()
 refreshStats()
                }}
 className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-elevated transition-colors cursor-pointer"title="Refresh Queue">
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input
 type="text"placeholder="Search ticket, company, user..."value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-surface-inset border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"/>
              {searchQuery && (
                <button
 onClick={() => setSearchQuery('')}
 className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground">
                  <X className="w-3 h-3"/>
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
                    'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
 activeQueueTab === tab.key
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-muted-foreground hover:bg-card-elevated hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60 scrollbar-thin scrollbar-thumb-slate-800">
            {loading && conversations.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="p-3 rounded-xl bg-surface-inset animate-pulse space-y-2">
                    <div className="h-3 bg-card-elevated rounded w-1/3"/>
                    <div className="h-3 bg-card-elevated rounded w-3/4"/>
                  </div>
                ))}
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
                <p>No tickets matching current filters.</p>
                <button
 onClick={resetFilters}
 className="px-3 py-1 text-xs font-bold text-primary hover:text-primary bg-surface-inset border border-border rounded-lg">
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
                        ? 'bg-card-elevated/95 border-l-4 border-primary/20 text-white shadow-inner'
                        : 'hover:bg-card-elevated/40 text-muted-foreground'
                    )}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="tabular-nums font-bold text-primary">{conv.ticket_number}</span>
                      <div className="flex items-center gap-1">
                        {conv.priority === 'urgent' && (
                          <span className="px-1.5 py-0.2 rounded text-xs font-bold bg-danger-surface text-destructive border border-danger-border">
 URGENT
                          </span>
                        )}
                        <span className={cn('px-1.5 py-0.2 rounded text-xs border font-medium', statusConfig.badgeClass)}>
                          {statusConfig.labelEn}
                        </span>
                      </div>
                    </div>

                    <div className="font-bold text-xs text-foreground truncate">{conv.subject}</div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate max-w-[140px] text-muted-foreground font-medium">
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
          <div className="xl:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
            <div className="h-full bg-surface-inset shadow-lg animate-in slide-in-from-right duration-200">
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