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
        'w-80 shrink-0 h-full overflow-y-auto bg-slate-900/95 p-4 border-l border-slate-800 space-y-4 text-xs select-text font-sans scrollbar-thin scrollbar-thumb-slate-800',
        isDrawer && 'w-full max-w-md shadow-2xl z-50'
      )}
    >
      {/* 1. Ticket Overview Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-indigo-400">
          <Tag className="w-3.5 h-3.5 text-indigo-400" />
          <span>Ticket Inspector</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Details"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Ticket Core Attributes Card */}
      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Ticket #</span>
          <span className="font-mono font-bold text-indigo-400 text-xs">{conversation.ticket_number}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Status</span>
          <span className={cn('px-2 py-0.5 rounded-md font-medium border text-[11px]', statusConfig.badgeClass)}>
            {statusConfig.labelEn}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Priority</span>
          <span className={cn('px-2 py-0.5 rounded-md font-medium border text-[11px]', priorityConfig.badgeClass)}>
            {priorityConfig.labelEn}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Category</span>
          <span className="font-medium text-slate-200">{categoryMeta?.labelEn || conversation.category}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Assigned Agent</span>
          <span className="font-medium text-indigo-300 flex items-center gap-1">
            <User className="w-3 h-3 text-indigo-400" />
            {conversation.assigned_to_name || 'Unassigned'}
          </span>
        </div>
      </div>

      {/* 3. Tenant Context Card */}
      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Tenant Workspace</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
            /{conversation.company_slug || 'tenant'}
          </span>
        </div>

        <div>
          <div className="font-bold text-slate-100 text-sm truncate">{conversation.company_name || 'Organization'}</div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
            <span>ID: {conversation.company_id.slice(0, 8)}...</span>
            <button
              type="button"
              onClick={() => copyToClipboard(conversation.company_id)}
              className="text-slate-500 hover:text-slate-300 p-0.5"
              title="Copy Full Company ID"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 space-y-2 text-slate-300 text-xs">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-200 truncate">{conversation.created_by_name}</span>
          </div>
          {conversation.created_by_email && (
            <div className="flex items-center gap-2 text-slate-400">
              <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate text-[11px]">{conversation.created_by_email}</span>
            </div>
          )}
        </div>

        {/* Direct Support Impersonation Launcher */}
        {onOpenImpersonationModal && (
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() =>
                onOpenImpersonationModal(
                  conversation.company_id,
                  conversation.company_name || 'Tenant'
                )
              }
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-amber-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-950 fill-amber-950" />
              <span>Launch Support Session</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. SLA & Timestamps */}
      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5 shadow-xs">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
          <Timer className="w-3.5 h-3.5 text-purple-400" />
          <span>SLA &amp; Timestamps</span>
        </div>

        <div className="space-y-2 text-slate-400 text-xs">
          <div className="flex items-center justify-between">
            <span>Created</span>
            <span className="text-slate-200">{formatDateTime(conversation.created_at)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>First Response</span>
            <span className={cn('font-semibold', conversation.first_response_at ? 'text-emerald-400' : 'text-amber-400')}>
              {slaFirstResponse}
            </span>
          </div>

          {conversation.resolved_at && (
            <div className="flex items-center justify-between text-emerald-400">
              <span>Resolved</span>
              <span>{formatDateTime(conversation.resolved_at)}</span>
            </div>
          )}

          {conversation.closed_at && (
            <div className="flex items-center justify-between text-slate-400">
              <span>Closed</span>
              <span>{formatDateTime(conversation.closed_at)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Attached Context Metadata (if any) */}
      {conversation.context_metadata && Object.keys(conversation.context_metadata).length > 0 && (
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Attached Context</span>
          </div>

          <div className="space-y-1.5 text-slate-300 font-mono text-[11px] bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
            {Object.entries(conversation.context_metadata).map(([key, val]) => (
              <div key={key} className="flex justify-between gap-2">
                <span className="text-slate-400 shrink-0">{key}:</span>
                <span className="text-slate-200 truncate" title={String(val)}>
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
