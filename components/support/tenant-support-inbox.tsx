'use client'

// ==============================================================================
// InkFlow SaaS - Tenant Support Inbox Component
// Clean, mobile-first list of active and resolved support conversations.
// ==============================================================================

import React, { useState, useMemo } from 'react'
import {
 Search,
 Plus,
 MessageSquare,
 Clock,
 CheckCircle2,
 AlertCircle,
 Inbox,
 Filter,
 Sparkles,
 ChevronRight,
 RefreshCw,
} from 'lucide-react'
import {
 SupportConversationRecord,
 SupportStatus,
 SupportCategory,
 SUPPORT_STATUS_CONFIG,
 SUPPORT_PRIORITY_CONFIG,
} from '@/types/support.types'
import { formatDate, formatTime } from '@/lib/formatters'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'

interface TenantSupportInboxProps {
 conversations: SupportConversationRecord[]
 selectedId: string | null
 onSelect: (id: string) => void
 onOpenNewModal: () => void
 loading: boolean
 onRefresh: () => void
}

export function TenantSupportInbox({
 conversations,
 selectedId,
 onSelect,
 onOpenNewModal,
 loading,
 onRefresh,
}: TenantSupportInboxProps) {
 const { tBilingual } = useI18n()
 const [activeTab, setActiveTab] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all')
 const [searchQuery, setSearchQuery] = useState('')

 const filteredList = useMemo(() => {
 return conversations.filter((c) => {
 if (activeTab !== 'all' && c.status !== activeTab) {
 return false
      }
 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase().trim()
 const matchesTicket = c.ticket_number.toLowerCase().includes(q)
 const matchesSubject = c.subject.toLowerCase().includes(q)
 const matchesPreview = c.last_message_preview?.toLowerCase().includes(q)
 if (!matchesTicket && !matchesSubject && !matchesPreview) {
 return false
        }
      }
 return true
    })
  }, [conversations, activeTab, searchQuery])

 const openCount = useMemo(
    () => conversations.filter((c) => c.status === 'open' || c.status === 'in_progress').length,
    [conversations]
  )

 const unreadCount = useMemo(
    () => conversations.reduce((acc, c) => acc + (c.unread_tenant_count || 0), 0),
    [conversations]
  )

 return (
    <div className="flex flex-col h-full bg-card border-r border-border select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-border /80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-foreground">
              {tBilingual('Support Inbox', 'সহায়তা ইনবক্স')}
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-white animate-pulse">
                {unreadCount} {tBilingual('New', 'নতুন')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
 onClick={onRefresh}
 title="Refresh"className="p-1.5 rounded-lg text-muted-foreground hover:text-muted-foreground hover:bg-muted transition-colors">
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button
 onClick={onOpenNewModal}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary rounded-xl shadow-sm shadow-indigo-500/20 transition-all cursor-pointer">
              <Plus className="w-3.5 h-3.5"/>
              <span>{tBilingual('New Ticket', 'নতুন টিকেট')}</span>
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input
 type="text"placeholder={tBilingual('Search tickets by ID or keyword...', 'টিকেট বা বিষয় দিয়ে খুঁজুন...')}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-border bg-muted/70 text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/20 transition-all placeholder:text-muted-foreground"/>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
          {(
            [
              { key: 'all', label: tBilingual('All', 'সকল'), count: conversations.length },
              {
 key: 'open',
 label: tBilingual('Open', 'উন্মুক্ত'),
 count: conversations.filter((c) => c.status === 'open').length,
              },
              {
 key: 'in_progress',
 label: tBilingual('Active', 'চলমান'),
 count: conversations.filter((c) => c.status === 'in_progress').length,
              },
              {
 key: 'resolved',
 label: tBilingual('Resolved', 'মীমাংসিত'),
 count: conversations.filter((c) => c.status === 'resolved').length,
              },
            ] as const
          ).map((tab) => (
            <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={cn(
                'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5',
 activeTab === tab.key
                  ? 'bg-surface-inset text-foreground '
                  : 'text-muted-foreground hover:bg-muted dark:hover:bg-muted'
              )}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
 className={cn(
                    'text-xs px-1.5 py-0.2 rounded-full font-bold',
 activeTab === tab.key
                      ? 'bg-card-elevated text-foreground dark:bg-muted '
                      : 'bg-muted/80 text-muted-foreground '
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border dark:divide-border/60">
        {loading && conversations.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="p-3 rounded-xl bg-muted animate-pulse space-y-2">
                <div className="h-3.5 bg-muted rounded w-1/3"/>
                <div className="h-3 bg-muted rounded w-4/5"/>
                <div className="h-2.5 bg-muted rounded w-1/2"/>
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <Inbox className="w-6 h-6"/>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {searchQuery ? tBilingual('No matches found', 'কোনো ফলাফল পাওয়া যায়নি') : tBilingual('No conversations yet', 'কোনো সহায়তা বার্তা নেই')}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                {tBilingual('Have a question or need technical help? Click"New Ticket"to start.', 'কোনো সহায়তা প্রয়োজন হলে"নতুন টিকেট"বাটনে ক্লিক করুন।')}
              </p>
            </div>
          </div>
        ) : (
 filteredList.map((conv) => {
 const statusConfig = SUPPORT_STATUS_CONFIG[conv.status]
 const priorityConfig = SUPPORT_PRIORITY_CONFIG[conv.priority]
 const isSelected = selectedId === conv.id
 const hasUnread = (conv.unread_tenant_count || 0) > 0

 return (
              <button
 key={conv.id}
 onClick={() => onSelect(conv.id)}
 className={cn(
                  'w-full text-left p-3.5 transition-all flex flex-col gap-1.5 cursor-pointer relative',
 isSelected
                    ? 'bg-primary/10/70 bg-primary/10 border-l-4 border-border'
                    : 'hover:bg-muted/80 dark:hover:bg-muted/40'
                )}
              >
                {/* Line 1: Ticket number + Status badge + Time */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="tabular-nums font-bold text-foreground text-xs">
                      {conv.ticket_number}
                    </span>
                    <span
 className={cn(
                        'px-2 py-0.5 rounded-md text-xs font-medium border',
 statusConfig.badgeClass
                      )}
                    >
                      {statusConfig.labelEn}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3"/>
                    <span>{formatDate(conv.last_message_at)}</span>
                  </div>
                </div>

                {/* Line 2: Subject */}
                <div className="flex items-center justify-between gap-2">
                  <h3
 className={cn(
                      'text-xs truncate font-medium',
 hasUnread
                        ? 'text-foreground font-bold'
                        : 'text-foreground '
                    )}
                  >
                    {conv.subject}
                  </h3>
                  {hasUnread && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0"/>
                  )}
                </div>

                {/* Line 3: Last Message Preview */}
                <p className="text-xs text-muted-foreground truncate line-clamp-1">
                  {conv.last_message_by && (
                    <span className="font-medium text-foreground">
                      {conv.last_message_by}:{' '}
                    </span>
                  )}
                  {conv.last_message_preview || tBilingual('No message preview', 'বার্তা নেই')}
                </p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
