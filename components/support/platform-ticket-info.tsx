'use client'

// ==============================================================================
// InkFlow SaaS - Platform Support Ticket Context & Tenant Info Pane
// Authoritative context inspection: Tenant Plan, SLA timers, Assigned Staff,
// and Direct Support Impersonation Session Launcher.
// ==============================================================================

import React from 'react'
import Link from 'next/link'
import {
 Building2,
 User,
 Clock,
 ExternalLink,
 ShieldCheck,
 Zap,
 Tag,
 Calendar,
 Layers,
 Sparkles,
 AlertCircle,
 FileText,
 Mail,
 Smartphone,
 Timer,
 CheckCircle2,
 X,
 Copy,
 Hash,
 Globe,
} from 'lucide-react'
import {
 SupportConversationRecord,
 SUPPORT_STATUS_CONFIG,
 SUPPORT_PRIORITY_CONFIG,
 SUPPORT_CATEGORIES,
} from '@/types/support.types'
import { formatDate, formatTime, formatDateTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface PlatformTicketInfoProps {
 conversation: SupportConversationRecord | null
 onOpenImpersonationModal?: (companyId: string, companyName: string) => void
 onClose?: () => void
 isDrawer?: boolean
}

export function PlatformTicketInfo({
 conversation,
 onOpenImpersonationModal,
 onClose,
 isDrawer = false,
}: PlatformTicketInfoProps) {
 if (!conversation) return null

 const categoryMeta = SUPPORT_CATEGORIES.find((c) => c.key === conversation.category)
 const statusConfig = SUPPORT_STATUS_CONFIG[conversation.status]
 const priorityConfig = SUPPORT_PRIORITY_CONFIG[conversation.priority]

  // Calculate First Response SLA elapsed
 const slaFirstResponse = conversation.first_response_at
    ? `${Math.round(
 Math.max(
          0,
 new Date(conversation.first_response_at).getTime() -
 new Date(conversation.created_at).getTime()
        ) / 60000
      )} mins`
    : 'Pending First Response'

 const copyToClipboard = (text: string) => {
 navigator.clipboard.writeText(text)
  }

 return (
    <div
 className={cn(
        'w-80 shrink-0 h-full overflow-y-auto bg-surface-inset p-4 border-l border-border space-y-4 text-xs select-text font-sans scrollbar-thin scrollbar-thumb-slate-800',
 isDrawer && 'w-full max-w-md shadow-lg z-50'
      )}
    >
      {/* 1. Ticket Overview Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs text-primary">
          <Tag className="w-3.5 h-3.5 text-primary"/>
          <span>Ticket Inspector</span>
        </div>
        {onClose && (
          <button
 type="button"onClick={onClose}
 className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card-elevated transition-colors cursor-pointer"title="Close Details">
            <X className="w-4 h-4"/>
          </button>
        )}
      </div>

      {/* 2. Ticket Core Attributes Card */}
      <div className="p-3.5 rounded-xl bg-surface-inset border border-border space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">Ticket #</span>
          <span className="tabular-nums font-bold text-primary text-xs">{conversation.ticket_number}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">Status</span>
          <span className={cn('px-2 py-0.5 rounded-md font-medium border text-xs', statusConfig.badgeClass)}>
            {statusConfig.labelEn}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">Priority</span>
          <span className={cn('px-2 py-0.5 rounded-md font-medium border text-xs', priorityConfig.badgeClass)}>
            {priorityConfig.labelEn}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">Category</span>
          <span className="font-medium text-foreground">{categoryMeta?.labelEn || conversation.category}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">Assigned Agent</span>
          <span className="font-medium text-primary flex items-center gap-1">
            <User className="w-3 h-3 text-primary"/>
            {conversation.assigned_to_name || 'Unassigned'}
          </span>
        </div>
      </div>

      {/* 3. Tenant Context Card */}
      <div className="p-3.5 rounded-xl bg-surface-inset border border-border space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-primary"/>
            <span>Tenant Workspace</span>
          </div>
          <span className="text-xs tabular-nums px-1.5 py-0.5 rounded-md bg-surface-inset border border-border text-muted-foreground">
            /{conversation.company_slug || 'tenant'}
          </span>
        </div>

        <div>
          <div className="font-bold text-foreground text-sm truncate">{conversation.company_name || 'Organization'}</div>
          <div className="text-xs text-muted-foreground tabular-nums flex items-center gap-1 mt-0.5">
            <span>ID: {conversation.company_id.slice(0, 8)}...</span>
            <button
 type="button"onClick={() => copyToClipboard(conversation.company_id)}
 className="text-muted-foreground hover:text-muted-foreground p-0.5"title="Copy Full Company ID">
              <Copy className="w-3 h-3"/>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-border space-y-2 text-muted-foreground text-xs">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0"/>
            <span className="font-semibold text-foreground truncate">{conversation.created_by_name}</span>
          </div>
          {conversation.created_by_email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0"/>
              <span className="truncate text-xs">{conversation.created_by_email}</span>
            </div>
          )}
        </div>

        {/* Direct Support Impersonation Launcher */}
        {onOpenImpersonationModal && (
          <div className="pt-2 border-t border-border">
            <button
 type="button"onClick={() =>
 onOpenImpersonationModal(
 conversation.company_id,
 conversation.company_name || 'Tenant'
                )
              }
 className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-warning bg-warning hover:bg-warning transition-all shadow-xs shadow-amber-500/20 cursor-pointer">
              <Zap className="w-3.5 h-3.5 text-warning fill-amber-950"/>
              <span>Launch Support Session</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. SLA & Timestamps */}
      <div className="p-3.5 rounded-xl bg-surface-inset border border-border space-y-2.5 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <Timer className="w-3.5 h-3.5 text-primary"/>
          <span>SLA &amp; Timestamps</span>
        </div>

        <div className="space-y-2 text-muted-foreground text-xs">
          <div className="flex items-center justify-between">
            <span>Created</span>
            <span className="text-foreground">{formatDateTime(conversation.created_at)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>First Response</span>
            <span className={cn('font-semibold', conversation.first_response_at ? 'text-success' : 'text-warning')}>
              {slaFirstResponse}
            </span>
          </div>

          {conversation.resolved_at && (
            <div className="flex items-center justify-between text-success">
              <span>Resolved</span>
              <span>{formatDateTime(conversation.resolved_at)}</span>
            </div>
          )}

          {conversation.closed_at && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Closed</span>
              <span>{formatDateTime(conversation.closed_at)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Attached Context Metadata (if any) */}
      {conversation.context_metadata && Object.keys(conversation.context_metadata).length > 0 && (
        <div className="p-3.5 rounded-xl bg-surface-inset border border-border space-y-2.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5 text-primary"/>
            <span>Attached Context</span>
          </div>

          <div className="space-y-1.5 text-muted-foreground tabular-nums text-xs bg-surface-inset p-2.5 rounded-xl border border-border">
            {Object.entries(conversation.context_metadata).map(([key, val]) => (
              <div key={key} className="flex justify-between gap-2">
                <span className="text-muted-foreground shrink-0">{key}:</span>
                <span className="text-foreground truncate"title={String(val)}>
                  {String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
